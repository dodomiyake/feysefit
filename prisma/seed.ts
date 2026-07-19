import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  customers,
  designers,
  pendingInvites,
  projects,
} from "../src/lib/mock-data";
import { seedMarketplaceApprovals } from "../src/lib/marketplace-approvals";
import { DEMO_DESIGNER_ID } from "../src/lib/customer-access";
import { DEMO_CREDENTIALS } from "../src/lib/demo-auth";
import { conversations } from "../src/lib/conversations";
import { toJson } from "../src/server/mappers/json";

const prisma = new PrismaClient();

async function main() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.customerMeasurementProfile.deleteMany();
  await prisma.customerReference.deleteMany();
  await prisma.project.deleteMany();
  await prisma.pendingInvite.deleteMany();
  await prisma.unlinkRequest.deleteMany();
  await prisma.marketplaceApproval.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.designer.deleteMany();

  const passwordHash = await bcrypt.hash("demo123", 10);

  const liveDesignerIds = new Set(["1", "2"]);

  for (const designer of designers) {
    await prisma.designer.create({
      data: {
        id: designer.id,
        businessName: designer.businessName,
        designerName: designer.designerName,
        location: designer.location,
        specialty: designer.specialty,
        bio: designer.bio,
        rating: designer.rating,
        reviewCount: designer.reviewCount,
        portfolioImages: JSON.stringify(designer.portfolioImages),
        coverImage: designer.coverImage,
        profileImage: designer.profileImage,
        marketplaceLive: liveDesignerIds.has(designer.id),
      },
    });
  }

  for (const customer of customers) {
    await prisma.customer.create({
      data: {
        id: customer.id,
        name: customer.name,
        location: customer.location,
        email: customer.email,
        projectCount: customer.projectCount,
        linkedDesignerId: customer.id === "1" ? DEMO_DESIGNER_ID : null,
        registrationType: customer.id === "1" ? "invited" : null,
      },
    });
  }

  for (const project of projects) {
    await prisma.project.create({
      data: {
        id: project.id,
        projectCode: project.projectCode,
        paletteId: project.paletteId,
        title: project.title,
        customerName: project.customerName,
        customerId: customers.find((c) => c.name === project.customerName)?.id,
        designerId: DEMO_DESIGNER_ID,
        outfitType: project.outfitType,
        deadline: project.deadline,
        budget: project.budget,
        status: project.status,
        referenceImages: JSON.stringify(project.referenceImages),
        customerUpdate: project.customerUpdate,
        internalNotes: project.internalNotes,
        measurements: project.measurements ? JSON.stringify(project.measurements) : null,
        galleryImages: project.galleryImages ? JSON.stringify(project.galleryImages) : null,
        primaryFabric: project.primaryFabric,
        secondaryMaterial: project.secondaryMaterial,
        lining: project.lining,
        startedDate: project.startedDate,
        estimatedDelivery: project.estimatedDelivery,
        measurementFitNote: project.measurementFitNote,
        teamMembers: project.teamMembers ? JSON.stringify(project.teamMembers) : null,
        lastUpdated: project.lastUpdated,
        customerReferences: {
          create: (project.customerReferences ?? []).map((ref) => ({
            id: ref.id,
            url: ref.url,
            category: ref.category,
            caption: ref.caption,
            uploadedAt: ref.uploadedAt,
          })),
        },
      },
    });
  }

  for (const invite of pendingInvites) {
    await prisma.pendingInvite.create({
      data: {
        id: invite.id,
        designerId: DEMO_DESIGNER_ID,
        name: invite.name,
        email: invite.email,
        projectType: invite.projectType,
        sentAt: invite.sentAt,
        sentAgo: invite.sentAgo,
        status: invite.status,
      },
    });
  }

  for (const approval of seedMarketplaceApprovals) {
    await prisma.marketplaceApproval.create({
      data: {
        id: approval.id,
        designerId: approval.designerId,
        designerName: approval.designerName,
        businessName: approval.businessName,
        specialty: approval.specialty,
        submittedAt: approval.submittedAt,
        status: approval.status,
        adminNotes: approval.adminNotes,
        declineReason: approval.declineReason,
      },
    });
  }

  await prisma.unlinkRequest.create({
    data: {
      id: "ur-1",
      customerId: "4",
      customerName: "Ngozi Eze",
      designerId: DEMO_DESIGNER_ID,
      designerName: "Adaeze Okonkwo",
      reason: "Relocating abroad permanently and wish to find a local designer.",
      submittedAt: "Jun 29, 2026",
      status: "pending",
      designerConfirmation: null,
    },
  });

  const conversationMeta: Record<string, { designerId?: string; customerId?: string; projectId?: string }> = {
    "project-1": { designerId: DEMO_DESIGNER_ID, customerId: "1", projectId: "1" },
    "customer-2": { designerId: DEMO_DESIGNER_ID, customerId: "2" },
    "customer-3": { designerId: DEMO_DESIGNER_ID, customerId: "3" },
    "team-1": { designerId: DEMO_DESIGNER_ID },
  };

  for (const conversation of conversations) {
    const meta = conversationMeta[conversation.id] ?? {};
    await prisma.conversation.create({
      data: {
        id: conversation.id,
        title: conversation.title,
        preview: conversation.preview,
        timestamp: conversation.timestamp,
        avatar: conversation.avatar,
        isGroup: conversation.isGroup ?? false,
        tag: conversation.tag,
        online: conversation.online ?? false,
        dimmed: conversation.dimmed ?? false,
        contactName: conversation.contactName,
        contactRole: conversation.contactRole,
        contactAvatar: conversation.contactAvatar,
        dateLabel: conversation.dateLabel,
        designerId: meta.designerId,
        customerId: meta.customerId,
        projectId: meta.projectId,
        messages: {
          create: conversation.messages.map((message) => ({
            id: message.id,
            sender: message.sender,
            senderName: message.senderName,
            text: message.text,
            timestamp: message.timestamp,
            attachments: message.attachments ? toJson(message.attachments) : null,
          })),
        },
      },
    });
  }

  const chiomaProject = projects.find((p) => p.customerName === "Chioma Adeyemi");
  if (chiomaProject?.measurements) {
    await prisma.customerMeasurementProfile.create({
      data: {
        customerId: "1",
        unit: "inches",
        preferredFit: "regular",
        status: "submitted",
        values: toJson(chiomaProject.measurements),
        updatedAt: "Jun 28, 2026",
      },
    });
  }

  await prisma.user.createMany({
    data: [
      {
        id: "user-designer-1",
        email: DEMO_CREDENTIALS.designer.email,
        passwordHash,
        role: "designer",
        name: "Adaeze Okonkwo",
        designerId: DEMO_DESIGNER_ID,
      },
      {
        id: "user-customer-1",
        email: DEMO_CREDENTIALS.customer.email,
        passwordHash,
        role: "customer",
        name: "Chioma Adeyemi",
        customerId: "1",
      },
      {
        id: "user-admin-1",
        email: DEMO_CREDENTIALS.admin.email,
        passwordHash,
        role: "admin",
        name: "FeyseFit Admin",
      },
    ],
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
