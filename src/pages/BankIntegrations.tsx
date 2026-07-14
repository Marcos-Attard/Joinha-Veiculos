"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Building2, ShieldCheck, AlertCircle, CheckCircle2, Settings2, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface Bank {
  id: string;
  name: string;
  status: 'Pendente' | 'Conectado' | 'Erro de Login';
  logo?: string;
}

const BankIntegrations = () => {
  const [banks, setBanks] = useState<Bank[]>([
    { id: 'itau', name: 'Itaú', status: 'Conectado' },
    { id: 'santander', name: 'Santander', status: 'Pendente' },
    { id: 'bv', name: 'BV Financeira', status: 'Erro de Login' },
    { id: 'bradesco', name: 'Bradesco', status: 'Pendente' },
    { id: 'pan', name: 'Banco Pan', status: 'Pendente' },
  ]);

  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para o formulário
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const handleConfigure = (bank: Bank) => {
    setSelectedBank(bank);
    setLogin('');
    setPassword('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!login || !password) {
      showError("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);
    
    try {
      // URL do Webhook de teste do n8n via ngrok
      const WEBHOOK_URL = "https://semidefensively-hymnological-elvia.ngrok-free.dev/webhook-test/integracao-bancos";

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          banco: selectedBank?.name,
          login: login,
          senha: password
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro no servidor: ${response.status}`);
      }

      showSuccess(`Conexão com ${selectedBank?.name} estabelecida com sucesso!`);
      
      if (selectedBank) {
        setBanks(prev => prev.map(b => 
          b.id === selectedBank.id ? { ...b, status: 'Conectado' } : b
        ));
      }
      
      setIsModalOpen(false);
    } catch (error: any) {
      showError("Erro ao testar conexão: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: Bank['status']) => {
    switch (status) {
      case 'Conectado':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 flex gap-1.5 items-center"><CheckCircle2 size={12}/> Conectado</Badge>;
      case 'Erro de Login':
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20 flex gap-1.5 items-center"><AlertCircle size={12}/> Erro de Login</Badge>;
      default:
        return <Badge variant="secondary" className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20 flex gap-1.5 items-center">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Settings2 className="text-[#d4af37]" size={32} />
          Gerenciamento de Bancos e Automação
        </h1>
        <p className="text-zinc-400 max-w-2xl">
          Insira as credenciais de acesso aos portais bancários. As senhas são criptografadas de ponta a ponta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banks.map((bank) => (
          <Card key={bank.id} className="bg-[#0a0a0a] border-zinc-800 hover:border-[#d4af37]/50 transition-all duration-300 group">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-[#d4af37]/30 transition-colors">
                  <Building2 className="text-zinc-500 group-hover:text-[#d4af37] transition-colors" size={24} />
                </div>
                {getStatusBadge(bank.status)}
              </div>
              <CardTitle className="text-xl font-bold text-white mt-4">{bank.name}</CardTitle>
              <CardDescription className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Portal de Financiamento</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => handleConfigure(bank)}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl font-bold py-6 transition-all"
              >
                Configurar Acesso
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <Building2 className="text-[#d4af37]" />
              {selectedBank?.name}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Configure as credenciais para automação de propostas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="login" className="text-xs font-black uppercase tracking-widest text-zinc-500">Login ou CPF</Label>
              <Input 
                id="login" 
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Digite seu usuário" 
                className="bg-zinc-900 border-zinc-800 h-12 rounded-xl focus:ring-[#d4af37] focus:border-[#d4af37]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass" className="text-xs font-black uppercase tracking-widest text-zinc-500">Senha do Portal</Label>
              <Input 
                id="pass" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="bg-zinc-900 border-zinc-800 h-12 rounded-xl focus:ring-[#d4af37] focus:border-[#d4af37]"
              />
            </div>
            
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex gap-3 items-start">
              <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Suas credenciais são armazenadas em um cofre seguro (Vault) e nunca são exibidas em texto claro para nenhum operador.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setIsModalOpen(false)}
              className="text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-xl font-bold"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isLoading}
              className="bg-[#d4af37] hover:bg-[#b8962e] text-black font-black rounded-xl px-8 h-12 transition-all"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> Testando...
                </span>
              ) : "Salvar e Testar Conexão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankIntegrations;