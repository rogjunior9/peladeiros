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
import { User, Phone, Mail, Shield, Bell, Settings as SettingsIcon, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { MonthlyChargeDialog } from "@/components/MonthlyChargeDialog";

// Mask Helpers
const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

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
    enableReminder2Days: true,
    enableReminder1Day: true,
    enableFinalList: true,
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
            phone: data.phone ? maskPhone(data.phone) : "",
            document: data.document ? maskCPF(data.document) : "",
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
    // Remove formatting before sending
    const rawPhone = profileData.phone.replace(/\D/g, "");
    const rawDocument = profileData.document.replace(/\D/g, "");

    try {
      const response = await fetch(`/api/users/${session?.user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileData.name,
          phone: rawPhone,
          document: rawDocument
        }),
      });

      if (response.ok) {
        toast({ title: "Perfil atualizado!", className: "bg-zinc-900 border-accent/20 text-white" });
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
        toast({ title: "Configurações salvas!", className: "bg-zinc-900 border-accent/20 text-white" });
      } else {
        throw new Error("Erro ao salvar");
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar configurações", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({ ...profileData, phone: maskPhone(e.target.value) });
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({ ...profileData, document: maskCPF(e.target.value) });
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-end justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-white uppercase tracking-tight">Configurações</h1>
          <p className="text-zinc-500 mt-1">Gerencie seu perfil e preferências</p>
        </div>
      </div>

      {/* Admin Settings Section */}
      {isAdmin && (
        <Card className="bg-zinc-950 border border-white/5 ring-1 ring-accent/20">
          <CardHeader className="bg-accent/5 border-b border-white/5 pb-4">
            <div className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5 text-accent" />
              <CardTitle className="text-white font-display uppercase tracking-wide text-lg">Administração do Sistema</CardTitle>
            </div>
            <CardDescription className="text-zinc-500">
              Configure as automações e dados globais da pelada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-zinc-400">ID do Grupo WhatsApp</Label>
                <Input
                  value={systemSettings.whatsappGroupId || ""}
                  onChange={(e) => setSystemSettings({ ...systemSettings, whatsappGroupId: e.target.value })}
                  placeholder="Ex: 12036304... (ID do n8n)"
                  className="bg-zinc-900 border-white/10 text-white focus:border-accent"
                />
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  ID usado pelo bot para mensagens
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Chave Pix Padrão</Label>
                <Input
                  value={systemSettings.pixKey || ""}
                  onChange={(e) => setSystemSettings({ ...systemSettings, pixKey: e.target.value })}
                  placeholder="Ex: email@chave.com"
                  className="bg-zinc-900 border-white/10 text-white focus:border-accent"
                />
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Aparecerá nas mensagens de cobrança
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Mensalidade (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">R$</span>
                  <Input
                    type="number"
                    value={systemSettings.monthlyFee || ""}
                    onChange={(e) => setSystemSettings({ ...systemSettings, monthlyFee: parseFloat(e.target.value) })}
                    className="pl-10 bg-zinc-900 border-white/10 text-white focus:border-accent"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Taxa Cartão (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={systemSettings.creditCardFee || ""}
                    onChange={(e) => setSystemSettings({ ...systemSettings, creditCardFee: parseFloat(e.target.value) })}
                    className="bg-zinc-900 border-white/10 text-white focus:border-accent pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-zinc-400">CPF Padrão (Fallback)</Label>
                <Input
                  value={systemSettings.defaultCpf || ""}
                  onChange={(e) => setSystemSettings({ ...systemSettings, defaultCpf: e.target.value })}
                  placeholder="CPF para cobranças sem cadastro"
                  className="bg-zinc-900 border-white/10 text-white focus:border-accent"
                />
              </div>
            </div>

            <Separator className="bg-white/10" />

            <h3 className="font-display font-medium flex items-center text-white text-lg">
              <Bell className="h-4 w-4 mr-2 text-accent" />
              Automações de WhatsApp
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                <div className="space-y-0.5">
                  <Label className="text-white">Lembrete 2 dias antes</Label>
                  <p className="text-[10px] text-zinc-500 uppercase">Enviar 5x ao dia</p>
                </div>
                <Switch
                  checked={systemSettings.enableReminder2Days}
                  onCheckedChange={(c) => setSystemSettings({ ...systemSettings, enableReminder2Days: c })}
                  className="data-[state=checked]:bg-accent"
                />
              </div>
              <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                <div className="space-y-0.5">
                  <Label className="text-white">Lembrete 1 dia antes</Label>
                  <p className="text-[10px] text-zinc-500 uppercase">A cada 2h até 15h</p>
                </div>
                <Switch
                  checked={systemSettings.enableReminder1Day}
                  onCheckedChange={(c) => setSystemSettings({ ...systemSettings, enableReminder1Day: c })}
                  className="data-[state=checked]:bg-accent"
                />
              </div>
              <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                <div className="space-y-0.5">
                  <Label className="text-white">Lista Final (15:30)</Label>
                  <p className="text-[10px] text-zinc-500 uppercase">Enviar lista com avulsos</p>
                </div>
                <Switch
                  checked={systemSettings.enableFinalList}
                  onCheckedChange={(c) => setSystemSettings({ ...systemSettings, enableFinalList: c })}
                  className="data-[state=checked]:bg-accent"
                />
              </div>
              <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                <div className="space-y-0.5">
                  <Label className="text-white">Cobrança Pós-Jogo</Label>
                  <p className="text-[10px] text-zinc-500 uppercase">Inadimplentes 12h dia seg.</p>
                </div>
                <Switch
                  checked={systemSettings.enableDebtors}
                  onCheckedChange={(c) => setSystemSettings({ ...systemSettings, enableDebtors: c })}
                  className="data-[state=checked]:bg-accent"
                />
              </div>
            </div>

            <Separator className="bg-white/10 my-6" />

            <div className="flex justify-between items-center bg-accent/10 p-4 rounded-lg border border-accent/20">
              <div>
                <h3 className="font-bold text-accent uppercase text-sm tracking-wide">Cobrança de Mensalistas</h3>
                <p className="text-xs text-zinc-400 mt-1">Gerencie os pagamentos mensais do grupo.</p>
              </div>
              <Button onClick={() => setShowMonthlyDialog(true)} variant="outline" className="border-accent/50 text-accent hover:bg-accent hover:text-black uppercase text-xs font-bold tracking-wider">
                Gerenciar
              </Button>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                className="bg-white text-black hover:bg-zinc-200 font-bold uppercase tracking-wider"
                onClick={handleSaveSettings}
                disabled={savingSettings || loadingSettings}
              >
                {savingSettings ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar Configurações"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Card */}
      <Card className="bg-zinc-950 border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-lg font-display font-bold text-white uppercase tracking-wide">Meu Perfil</CardTitle>
          <CardDescription className="text-zinc-500">Suas informações básicas</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4 min-w-[200px]">
              <div className="relative group">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl group-hover:bg-accent/30 transition-all" />
                <Avatar className="h-32 w-32 border-4 border-black relative z-10 shadow-2xl">
                  <AvatarImage src={session?.user?.image || ""} />
                  <AvatarFallback className="text-4xl bg-zinc-900 text-zinc-500 font-bold border border-white/10">
                    {session?.user?.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center">
                <p className="font-bold text-xl text-white font-display uppercase tracking-wide">{session?.user?.name}</p>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <Badge variant="outline" className="border-white/10 text-zinc-400 uppercase text-[10px] tracking-wider">
                    {getPlayerTypeLabel(session?.user?.playerType || "CASUAL")}
                  </Badge>
                  {session?.user?.role === "ADMIN" && (
                    <Badge className="bg-accent text-black border-none uppercase text-[10px] font-bold tracking-wider">Admin</Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator orientation="vertical" className="hidden md:block bg-white/10 h-auto" />

            {/* Form Section */}
            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-400 flex items-center">
                  <User className="h-4 w-4 mr-2 text-accent" />
                  Nome
                </Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                  placeholder="Seu nome"
                  className="bg-zinc-900 border-white/10 text-white focus:border-accent h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-400 flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-accent" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={session?.user?.email || ""}
                  disabled
                  className="bg-black border-white/5 text-zinc-500 h-12 cursor-not-allowed opacity-70"
                />
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider pl-1">
                  O email não pode ser alterado pois está vinculado à conta Google
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-zinc-400 flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-accent" />
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={handlePhoneChange}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  className="bg-zinc-900 border-white/10 text-white focus:border-accent h-12 font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document" className="text-zinc-400 flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-accent" />
                  CPF
                </Label>
                <Input
                  id="document"
                  value={profileData.document}
                  onChange={handleCPFChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="bg-zinc-900 border-white/10 text-white focus:border-accent h-12 font-mono"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-accent text-black hover:bg-white font-bold uppercase tracking-widest px-8 h-12"
                >
                  {savingProfile ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Salvar Alterações"}
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
