"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createNotification({
    userId,
    title,
    message,
    type = "INFO",
    link = null
}: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    link?: string | null;
}) {
    await prisma.notification.create({
        data: {
            userId,
            title,
            message,
            type,
            link
        }
    });
    // We don't revalidate path here usually because this is called by other actions, 
    // but the recipient might be viewing the page. 
    // Since we poll in the UI, it will show up eventually.
}


export async function getNotifications() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return [];
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) return [];

    const notifications = await prisma.notification.findMany({
        where: {
            userId: user.id,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 20,
    });

    return notifications;
}

export async function getUnreadCount() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return 0;
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) return 0;

    const count = await prisma.notification.count({
        where: {
            userId: user.id,
            read: false,
        },
    });

    return count;
}

export async function markAsRead(notificationId: string) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return { error: "Not authenticated" };
    }

    await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
    });

    revalidatePath("/");
    return { success: true };
}

export async function markAllAsRead() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return { error: "Not authenticated" };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) return { error: "User not found" };

    await prisma.notification.updateMany({
        where: {
            userId: user.id,
            read: false
        },
        data: { read: true },
    });

    revalidatePath("/");
    return { success: true };
}
