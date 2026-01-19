"use client";

import { useEffect, useState } from "react";
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
import { User, Phone, Mail, Shield, Bell, Settings as SettingsIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { MonthlyChargeDialog } from "@/components/MonthlyChargeDialog";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();

  // Profile State
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    phone: "",
    document: "",
  });

  // System Settings State (Admin)
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    whatsappGroupId: "",
    pixKey: "",
    monthlyFee: 60.0,
    creditCardFee: 5.0,
    defaultCpf: "",
    enableReminder2Days: true, // Default
    enableReminder1Day: true,
    enableFinalList: true,
    enableDebtors: true
    enableDebtors: true
  });

  const [showMonthlyDialog, setShowMonthlyDialog] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    if (session?.user?.id) {
      // Fetch fresh data
      fetch(`/api/users/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          setProfileData({
            name: data.name || "",
            phone: data.phone || "",
            document: data.document || "",
          });
        })
        .catch(console.error);
    }

    if (isAdmin) {
      fetchSystemSettings();
    }
  }, [session, isAdmin]);

  const fetchSystemSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        // Merge com defaults para evitar nulls
        setSystemSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("Erro ao carregar configuracoes", error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const response = await fetch(`/api/users/${session?.user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        toast({ title: "Perfil atualizado!", variant: "success" });
        await update();
      } else {
        throw new Error("Erro ao atualizar");
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao atualizar perfil", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(systemSettings)
      });

      if (response.ok) {
        toast({ title: "Configurações salvas!", variant: "success" });
      } else {
        throw new Error("Erro ao salvar");
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar configurações", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  /* Old handleMonthlyCharge removed in favor of Dialog */


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracoes</h1>
        <p className="text-gray-500">Gerencie suas informacoes e preferencias</p>
      </div>

      {/* Admin Settings Section */}
      {isAdmin && (
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50/50">
            <div className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900">Configuracoes do Sistema (Admin)</CardTitle>
            </div>
            <CardDescription>
              Configure as automacoes e dados globais da pelada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>ID do Grupo WhatsApp</Label>
                <Input
                  value={systemSettings.whatsappGroupId || ""}
                  onChange={(e) => setSystemSettings({ ...systemSettings, whatsappGroupId: e.target.value })}
                  placeholder="Ex: 12036304... (ID do n8n)"
                />
                <p className="text-xs text-gray-500">
                  ID usado pelo bot para enviar mensagens.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Chave Pix Padrao</Label>
                <Input
                  value={systemSettings.pixKey || ""}
                  onChange={(e) => setSystemSettings({ ...systemSettings, pixKey: e.target.value })}
                  placeholder="Ex: email@chave.com"
                />
                <p className="text-xs text-gray-500">
                  Aparecera nas mensagens de cobranca e lista.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Valor da Mensalidade (R$)</Label>
                <Input
                  type="number"
                  value={systemSettings.monthlyFee || ""}
                  onChange={(e) => setSystemSettings({ ...systemSettings, monthlyFee: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa Cartão Crédito (%)</Label>
                <Input
                  type="number"
                  value={systemSettings.creditCardFee || ""}
                  onChange={(e) => setSystemSettings({ ...systemSettings, creditCardFee: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>CPF Padrão (Fallback)</Label>
                <Input
                  value={systemSettings.defaultCpf || ""}
                  onChange={(e) => setSystemSettings({ ...systemSettings, defaultCpf: e.target.value })}
                  placeholder="CPF para cobranças sem cadastro"
                />
              </div>
            </div>

            <Separator />

            <h3 className="font-medium flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              Automacoes de WhatsApp
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lembrete 2 dias antes</Label>
                  <p className="text-sm text-gray-500">Enviar 5x ao dia</p>
                </div>
                <Switch
                  checked={systemSettings.enableReminder2Days}
                  onCheckedChange={(c) => setSystemSettings({ ...systemSettings, enableReminder2Days: c })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lembrete 1 dia antes</Label>
                  <p className="text-sm text-gray-500">Enviar a cada 2h ate 15h</p>
                </div>
                <Switch
                  checked={systemSettings.enableReminder1Day}
                  onCheckedChange={(c) => setSystemSettings({ ...systemSettings, enableReminder1Day: c })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lista Final (15:30)</Label>
                  <p className="text-sm text-gray-500">Enviar lista com avulsos 1 dia antes</p>
                </div>
                <Switch
                  checked={systemSettings.enableFinalList}
                  onCheckedChange={(c) => setSystemSettings({ ...systemSettings, enableFinalList: c })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cobranca Pós-Jogo</Label>
                  <p className="text-sm text-gray-500">Enviar lista de inadimplentes as 12h do dia seguinte</p>
                </div>
                <Switch
                  checked={systemSettings.enableDebtors}
                  onCheckedChange={(c) => setSystemSettings({ ...systemSettings, enableDebtors: c })}
                />
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex justify-between items-center bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div>
                <h3 className="font-medium text-yellow-900">Cobrança de Mensalistas</h3>
                <p className="text-sm text-yellow-700">Enviar lembrete para mensalistas.</p>
              </div>
              <Button onClick={() => setShowMonthlyDialog(true)} variant="outline" className="border-yellow-600 text-yellow-700 hover:bg-yellow-100">
                Gerenciar
              </Button>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSaveSettings}
                disabled={savingSettings || loadingSettings}
              >
                {savingSettings ? "Salvando..." : "Salvar Configuracoes do Sistema"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
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
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData({ ...profileData, phone: e.target.value })
                  }
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">
                  <Shield className="h-4 w-4 inline mr-2" />
                  CPF
                </Label>
                <Input
                  id="document"
                  value={profileData.document}
                  onChange={(e) =>
                    setProfileData({ ...profileData, document: e.target.value })
                  }
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {savingProfile ? "Salvando..." : "Salvar Alteracoes"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <MonthlyChargeDialog open={showMonthlyDialog} onOpenChange={setShowMonthlyDialog} />
    </div>
  );
}
