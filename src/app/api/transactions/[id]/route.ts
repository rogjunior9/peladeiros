import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem excluir transacoes" },
        { status: 403 }
      );
    }

    await prisma.transaction.delete({
      where: { id: params.id },
    });

    await createAuditLog(
      session.user.id,
      "DELETE",
      "TRANSACTION",
      params.id,
      {}
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir transacao:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
