"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { getPlayerTypeLabel } from "@/lib/utils";
import { User, Phone, Mail, Shield } from "lucide-react";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    phone: session?.user?.phone || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${session?.user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Perfil atualizado!",
          variant: "success",
        });
        // Update session
        await update();
      } else {
        throw new Error("Erro ao atualizar");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracoes</h1>
        <p className="text-gray-500">Gerencie suas informacoes pessoais</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
          <CardDescription>Suas informacoes basicas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={session?.user?.image || ""} />
                <AvatarFallback className="text-2xl bg-green-100 text-green-700">
                  {session?.user?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="font-medium">{session?.user?.name}</p>
                <div className="flex items-center justify-center space-x-2 mt-1">
                  <Badge variant="outline">
                    {getPlayerTypeLabel(session?.user?.playerType || "CASUAL")}
                  </Badge>
                  {session?.user?.role === "ADMIN" && (
                    <Badge variant="success">Admin</Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator orientation="vertical" className="hidden md:block" />

            {/* Form Section */}
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  <User className="h-4 w-4 inline mr-2" />
                  Nome
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Seu nome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={session?.user?.email || ""}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  O email nao pode ser alterado pois esta vinculado a conta Google
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saving ? "Salvando..." : "Salvar Alteracoes"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informacoes da Conta</CardTitle>
          <CardDescription>Detalhes sobre sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">Tipo de Usuario</p>
                  <p className="text-sm text-gray-500">
                    {session?.user?.role === "ADMIN"
                      ? "Administrador - Acesso total ao sistema"
                      : "Jogador - Acesso limitado"}
                  </p>
                </div>
              </div>
              <Badge
                variant={session?.user?.role === "ADMIN" ? "success" : "outline"}
              >
                {session?.user?.role === "ADMIN" ? "Admin" : "Player"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">Tipo de Jogador</p>
                  <p className="text-sm text-gray-500">
                    {session?.user?.playerType === "MONTHLY"
                      ? "Mensalista - Paga mensalidade fixa"
                      : session?.user?.playerType === "GOALKEEPER"
                      ? "Goleiro - Nao paga"
                      : "Avulso - Paga por jogo"}
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                {getPlayerTypeLabel(session?.user?.playerType || "CASUAL")}
              </Badge>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Dica:</strong> Entre em contato com um administrador para
                alterar seu tipo de jogador ou solicitar permissoes de admin.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
