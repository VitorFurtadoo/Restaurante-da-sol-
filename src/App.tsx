/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  logout, 
  onAuthStateChanged,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  getDocFromServer
} from './firebase';
import { UserProfile, DailyMenu, MenuItem, Period, Order, SECTORS } from './types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  LogOut, 
  LogIn, 
  ChefHat, 
  ShoppingCart, 
  ListOrdered, 
  ChevronRight,
  ChevronLeft,
  Plus, 
  Trash2, 
  Download,
  FileText,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Bell,
  BellOff,
  Lock,
  Unlock,
  BarChart2,
  TrendingUp,
  History,
  Flame,
  Utensils,
  Leaf,
  Users,
  Calendar,
  PieChart as PieChartIcon,
  Search,
  Edit2,
  X,
  Truck,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Dashboard & Analytics ---

function DashboardStats({ allOrders }: { allOrders: Order[] }) {
  if (allOrders.length === 0) {
    return (
      <div className="bg-natural-bg rounded-[40px] p-20 text-center border border-dashed border-natural-border">
        <TrendingUp className="w-12 h-12 text-natural-border mx-auto mb-4" />
        <p className="font-serif italic text-natural-text-muted">Sem dados suficientes para gerar estatísticas.</p>
      </div>
    );
  }

  // Group by sector
  const sectorDataMap = allOrders.reduce((acc, curr) => {
    acc[curr.sector] = (acc[curr.sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sectorData = Object.entries(sectorDataMap).map(([name, total]) => ({ name, total }));

  // Group by day (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return format(d, 'yyyy-MM-dd');
  }).reverse();

  const dailyData = last7Days.map(date => {
    return {
      date: format(new Date(date + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
      total: allOrders.filter(o => o.date === date).length
    };
  });

  const COLORS = ['#2C1810', '#D4C9BD', '#8E9299', '#5A5A40', '#9E9E9E'];

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-natural-accent text-white p-8 rounded-[32px] shadow-xl">
          <p className="text-[10px] uppercase font-bold tracking-widest text-white/60 mb-2">Total Geral</p>
          <h4 className="text-5xl font-serif italic">{allOrders.length}</h4>
          <p className="text-xs mt-2 text-white/60">Pedidos registrados no sistema</p>
        </div>
        <div className="bg-natural-card border border-natural-border p-8 rounded-[32px] shadow-natural">
          <p className="text-[10px] uppercase font-bold tracking-widest text-natural-accent mb-2">Mais Ativo</p>
          <h4 className="text-3xl font-serif italic text-natural-accent">
            {sectorData.sort((a,b) => b.total - a.total)[0]?.name || '--'}
          </h4>
          <p className="text-xs mt-2 text-natural-text-muted">Setor com maior volume</p>
        </div>
        <div className="bg-natural-card border border-natural-border p-8 rounded-[32px] shadow-natural">
          <p className="text-[10px] uppercase font-bold tracking-widest text-natural-accent mb-2">Média Diária</p>
          <h4 className="text-3xl font-serif italic text-natural-accent">
            {(allOrders.length / (new Set(allOrders.map(o => o.date)).size || 1)).toFixed(1)}
          </h4>
          <p className="text-xs mt-2 text-natural-text-muted">Pedidos por dia de operação</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[40px] border border-natural-border shadow-natural">
          <div className="flex items-center gap-3 mb-8">
            <PieChartIcon className="w-5 h-5 text-natural-accent" />
            <h5 className="font-serif italic text-xl text-natural-accent">Pedidos por Setor</h5>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #D4C9BD', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', fontSize: '12px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {sectorData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-natural-border shadow-natural">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="w-5 h-5 text-natural-accent" />
            <h5 className="font-serif italic text-xl text-natural-accent">Tendência (Últimos 7 Dias)</h5>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #D4C9BD', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', fontSize: '12px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="total" stroke="#2C1810" strokeWidth={3} dot={{ r: 6, fill: '#2C1810', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationToast({ message, onClose }: { message: string, onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      className="fixed bottom-8 right-8 z-[200] bg-natural-accent text-white p-6 rounded-[32px] shadow-2xl flex items-center gap-4 border border-white/10"
    >
      <div className="bg-white/20 p-2 rounded-full ring-4 ring-white/10">
        <Bell className="w-6 h-6 animate-bounce" />
      </div>
      <div>
        <h6 className="font-bold text-sm tracking-tight">Novo Pedido Recebido!</h6>
        <p className="text-xs text-white/80">{message}</p>
      </div>
    </motion.div>
  );
}

// --- Components ---

function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center select-none group", className)}>
      {/* Filled Chef Hat SVG */}
      <svg 
        width="38" 
        height="32" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="text-natural-accent relative z-10 mb-[-8px] ml-2 drop-shadow-sm group-hover:-rotate-6 transition-transform"
      >
        <path d="M17 21a1 1 0 0 0 1-1v-4.59a1.5 1.5 0 0 1 .44-1.06l1.12-1.12a3 3 0 0 0-4.24-4.24 3 3 0 0 0-5.64 0 3 3 0 0 0-4.24 4.24l1.12 1.12a1.5 1.5 0 0 1 .44 1.06V20a1 1 0 0 0 1 1h10z" />
        <path d="M7.5 21h9" stroke="#F9F8F6" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      
      {/* Restaurante Text */}
      <div className="-rotate-[5deg] flex flex-col items-center">
        <span className="font-serif italic text-3xl sm:text-4xl font-black tracking-tighter text-natural-accent leading-none">
          Restaurante
        </span>
        
        {/* DA SOL Text with side waves */}
        <div className="flex items-center gap-1 sm:gap-2 mt-0.5 ml-3">
          <svg width="18" height="8" viewBox="0 0 24 8" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" className="text-natural-accent">
            <path d="M2 6c3-4 6-4 10 0s7 4 10 0" />
          </svg>
          <span className="font-serif font-black tracking-[0.18em] text-[12px] sm:text-[14px] uppercase text-natural-accent drop-shadow-sm">
            Da Sol
          </span>
          <svg width="18" height="8" viewBox="0 0 24 8" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" className="text-natural-accent">
            <path d="M2 6c3-4 6-4 10 0s7 4 10 0" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Navbar({ user, profile, onLogin, onLogout, setView }: { user: any, profile: UserProfile | null, onLogin: () => void, onLogout: () => void, setView: (v: 'user' | 'admin') => void }) {
  return (
    <nav className="bg-natural-card border-b border-natural-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-[100px] items-center">
          <div className="flex items-center cursor-pointer pt-2" onClick={() => setView('user')}>
            <BrandLogo />
          </div>

          <div className="flex items-center gap-6">
            <span className="hidden md:inline-flex bg-natural-border/40 text-natural-text-muted text-[11px] font-bold uppercase py-1.5 px-4 rounded-full">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </span>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-natural-text">{user.displayName || user.email}</span>
                  <span className="text-[10px] uppercase font-bold text-natural-accent tracking-tighter">
                    {profile?.role === 'admin' ? 'Administrador' : 'Colaborador'}
                  </span>
                </div>
                <button 
                  onClick={onLogout}
                  className="p-2 text-natural-text-muted hover:text-natural-accent hover:bg-natural-accent/5 rounded-full transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className="flex items-center gap-2 text-natural-text-muted hover:text-natural-accent text-sm font-bold transition-all px-4 py-2 border border-transparent hover:border-natural-border rounded-xl"
              >
                <LogIn className="w-4 h-4" />
                <span>Área Administrativa</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function LoginModal({ isOpen, onClose, onLoginSuccess }: { isOpen: boolean, onClose: () => void, onLoginSuccess: (u: any, p: UserProfile) => void }) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleProfileSync = async (user: any, nameDefault: string) => {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    } else {
      // Create new profile if it doesn't exist
      const isDev = user.email === 'vitor3729@hotmail.com' || user.email === 'conieOliveira@gmail.com' || user.email === 'admin@restaurantedasol.com';
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || nameDefault,
        role: isDev ? 'admin' : 'user',
        isApproved: isDev
      };
      await setDoc(docRef, newProfile);
      return newProfile;
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const profile = await handleProfileSync(result.user, result.user.displayName || 'Usuário Google');
      onLoginSuccess(result.user, profile);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Erro ao autenticar com Google: " + (err.code || "Tente novamente."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Fallback for hardcoded admin login
    if (cleanEmail === 'vascao123' && cleanPassword === 'vascao123') {
      try {
        const cred = await signInAnonymously(auth);
        const adminProfile: UserProfile = { 
          uid: cred.user.uid, 
          email: 'admin@restaurantedasol.com', 
          name: 'Administrador Principal', 
          role: 'admin', 
          isApproved: true 
        };
        await setDoc(doc(db, 'users', cred.user.uid), adminProfile);
        onLoginSuccess(cred.user, adminProfile);
        onClose();
        return;
      } catch (err: any) {
        console.error(err);
        setError("Erro ao autenticar administrador: " + (err.message || "Erro de permissão."));
        setIsLoading(false);
        return;
      }
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await handleProfileSync(cred.user, email);
      onLoginSuccess(cred.user, profile);
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError("Usuário não cadastrado.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Senha incorreta.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Muitas tentativas falhas. Tente novamente mais tarde.");
      } else {
        setError("Erro ao entrar: " + (err.message || "Tente novamente."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const isDev = email === 'vitor3729@hotmail.com' || email === 'conieOliveira@gmail.com';
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: email,
        name: name,
        role: isDev ? 'admin' : 'user',
        isApproved: isDev
      };
      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      onLoginSuccess(cred.user, newProfile);
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Este e-mail já está em uso.");
      } else if (err.code === 'auth/weak-password') {
        setError("Senha muito fraca. Use pelo menos 6 caracteres.");
      } else if (err.code === 'auth/invalid-email') {
        setError("E-mail inválido.");
      } else {
        setError("Erro ao criar conta: " + (err.message || "Tente novamente."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-natural-text/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-natural-card border border-natural-border w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
      >
        <div className="p-10">
          <div className="flex justify-between items-center mb-8">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-natural-accent tracking-widest mb-1">Acesso Restrito</span>
              <h2 className="text-3xl font-serif italic text-natural-accent">{tab === 'login' ? 'Identificação' : 'Cadastro'}</h2>
            </div>
            <button onClick={onClose} className="p-2 text-natural-text-muted hover:bg-natural-accent/5 rounded-full transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {tab === 'login' && (
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-natural-border py-4 rounded-2xl font-bold text-sm text-natural-text hover:bg-natural-bg transition-all mb-6 shadow-sm disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebase/anonymous/google.svg" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
              Entrar com o Google
            </button>
          )}

          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-natural-border"></div>
            <span className="flex-shrink mx-4 text-[10px] font-bold text-natural-text-muted uppercase tracking-widest">ou use seu e-mail</span>
            <div className="flex-grow border-t border-natural-border"></div>
          </div>

          <div className="flex p-1 bg-natural-bg rounded-2xl mb-8 border border-natural-border">
            <button 
              onClick={() => { setTab('login'); setError(null); }}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                tab === 'login' ? "bg-natural-card text-natural-accent shadow-sm" : "text-natural-text-muted hover:bg-natural-card/50"
              )}
            >
              Entrar
            </button>
            <button 
              onClick={() => { setTab('signup'); setError(null); }}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                tab === 'signup' ? "bg-natural-card text-natural-accent shadow-sm" : "text-natural-text-muted hover:bg-natural-card/50"
              )}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={tab === 'login' ? handleLogin : handleSignUp} className="space-y-6">
            {tab === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-natural-accent uppercase ml-1">NOME COMPLETO</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-natural-bg border border-natural-border focus:border-natural-accent-light outline-none rounded-2xl p-4 text-sm font-medium transition-all"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest text-natural-accent uppercase ml-1">E-MAIL</label>
              <input 
                type="text"
                required
                className="w-full bg-natural-bg border border-natural-border focus:border-natural-accent-light outline-none rounded-2xl p-4 text-sm font-medium transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Ex: seu@email.com"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest text-natural-accent uppercase ml-1">SENHA</label>
              <input 
                type="password"
                required
                className="w-full bg-natural-bg border border-natural-border focus:border-natural-accent-light outline-none rounded-2xl p-4 text-sm font-medium transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-700 text-[10px] font-bold uppercase tracking-tight text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-natural-accent text-white py-5 rounded-2xl font-bold shadow-xl shadow-natural/10 hover:bg-natural-text active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50"
            >
              {isLoading ? 'Aguarde...' : tab === 'login' ? 'Entrar no Sistema' : 'Solicitar Acesso'}
            </button>
          </form>

          {tab === 'signup' && (
            <p className="mt-6 text-[10px] text-natural-text-muted text-center italic leading-relaxed">
              * Sua conta será criada, mas o acesso será liberado apenas após a aprovação de um administrador.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// --- App Logic ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [adminSubView, setAdminSubView] = useState<'dashboard' | 'orders' | 'menu' | 'history' | 'users' | 'help'>('dashboard');
  const [userSubView, setUserSubView] = useState<'order' | 'history' | 'help'>('order');
  const [currentMenu, setCurrentMenu] = useState<DailyMenu | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('lunch');
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orderObservation, setOrderObservation] = useState('');
  const [orderMode, setOrderMode] = useState<'marmitex' | 'combo_pastel' | null>(null);
  const [comboPastel1, setComboPastel1] = useState<string>('');
  const [comboPastel2, setComboPastel2] = useState<string>('');
  const [comboBeverage, setComboBeverage] = useState<string>('');
  const [userName, setUserName] = useState('');
  const [deliveryType, setDeliveryType] = useState<'entrega' | 'retirada' | ''>('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [lastOrderCount, setLastOrderCount] = useState<number | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Load notification permission and register SW
  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('Service Worker registrado com sucesso');
          setSwRegistration(reg);
        })
        .catch(err => console.error('Erro ao registrar Service Worker:', err));
    }
  }, []);

  const requestNotifPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
  };

  const playNotifSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2857/2857-preview.mp3');
    audio.play().catch(e => {
      // Browsers block audio playback without prior user interaction.
      // We catch this to prevent it from being reported as a crash.
      if (e.name !== 'NotAllowedError') {
        console.warn("Erro ao tocar som:", e);
      }
    });
  };

  const testNotifications = () => {
    playNotifSound();
    const notificationTitle = 'Teste de Alerta - Restaurante da Sol';
    const notificationOptions = {
      body: 'Este é um teste para verificar as notificações e o som.',
      icon: 'https://www.google.com/favicon.ico',
      vibrate: [200, 100, 200],
      tag: 'test-notification'
    };

    if (swRegistration) {
      swRegistration.showNotification(notificationTitle, notificationOptions);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notificationTitle, notificationOptions);
    } else {
      setNotification("Permissão de notificação não concedida ou negada.");
    }
  };

  // 1. Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        // Test connection to the active firestore instance
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Conexão com Firestore ativa.");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase Offline Error:", error.message);
          setNotification("O app não conseguiu se conectar ao banco de dados. Verifique se o ID 'restaurantedasol' está ativo no seu console.");
        }
      }
    }
    testConnection();
  }, []);

  // 2. Auth & Profile
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const path = `users/${u.uid}`;
        try {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const p = docSnap.data() as UserProfile;
            setProfile(p);
            if (p.role === 'admin' && p.isApproved) setView('admin');
          } else {
            // No profile found - check if this was a direct hardcoded login 
            // Or if we need to create one for new email users
            console.log("No profile found for user:", u.uid);
            setProfile(null);
          }
        } catch (e) {
          console.error("Error fetching profile:", e);
          setProfile(null);
        }
      } else {
        setProfile(null);
        setView('user');
      }
      setLoading(false);
    });
  }, []);

  // Fetch Current Menu
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const menuId = `${today}_${selectedPeriod}`;
    const path = `menus/${menuId}`;
    const menuRef = doc(db, 'menus', menuId);
    
    return onSnapshot(menuRef, (doc) => {
      if (doc.exists()) {
        setCurrentMenu(doc.data() as DailyMenu);
      } else {
        setCurrentMenu(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }, [selectedPeriod]);

  useEffect(() => {
    if (userSubView === 'order' && currentMenu) {
      if (!currentMenu.isComboEnabled) {
        setOrderMode('marmitex');
      }
    }
  }, [userSubView, currentMenu?.isComboEnabled]);

  // Admin: Fetch All Orders
  useEffect(() => {
    if (profile?.role === 'admin') {
      const path = 'orders';
      const ordersRef = collection(db, 'orders');
      // Limit to orders to save quota
      // For notifications and dashboard, we mostly care about recent orders.
      
      const q = query(
        ordersRef,
        orderBy('timestamp', 'desc'),
        limit(10000)
      );

      return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
        
        // Notification Logic
        if (lastOrderCount !== null && orders.length > lastOrderCount) {
          const newOrder = orders.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))[0];
          const msg = `${newOrder.sector} acabou de enviar um pedido.`;
          setNotification(msg);

          // Audio and System Notification
          playNotifSound();
          
          if (notifPermission === 'granted') {
            const notificationTitle = 'Novo Pedido - Restaurante da Sol';
            const notificationOptions = {
              body: msg,
              icon: 'https://www.google.com/favicon.ico',
              badge: 'https://www.google.com/favicon.ico',
              vibrate: [200, 100, 200, 100, 200],
              tag: 'new-order',
              renotify: true
            };

            if (swRegistration) {
              swRegistration.showNotification(notificationTitle, notificationOptions);
            } else if ('Notification' in window) {
              new Notification(notificationTitle, notificationOptions);
            }
          }
        }
        
        setAllOrders(orders);
        setLastOrderCount(orders.length);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      });
    }
  }, [profile, lastOrderCount]);

  const handleToggleItem = (itemName: string) => {
    setSelectedItems(prev => {
      const isSelected = prev.includes(itemName);
      const item = currentMenu?.items.find(i => i.name === itemName);
      if (!item) return prev;

      if (isSelected) {
        return prev.filter(i => i !== itemName);
      } else {
        // Enforce "Marmitex vs Pastel" exclusivity
        const isPastelOrBeverage = item.category === 'pastel' || item.category === 'beverage';
        
        if (isPastelOrBeverage) {
          // If selecting pastel/beverage, clear marmitex items
          const hasMarmitexItems = prev.some(name => {
            const cat = currentMenu?.items.find(i => i.name === name)?.category;
            return cat && ['protein', 'accompaniment', 'potato', 'garnish'].includes(cat);
          });
          
          if (hasMarmitexItems) {
            // Keep only existing pastels/beverages if we want to allow switching, 
            // but the prompt implies a mode switch.
            const onlyPastelsAndBeverages = prev.filter(name => {
              const cat = currentMenu?.items.find(i => i.name === name)?.category;
              return cat === 'pastel' || cat === 'beverage';
            });
            prev = onlyPastelsAndBeverages;
          }

          if (item.category === 'pastel') {
            const currentPastels = prev.filter(name => 
              currentMenu?.items.find(i => i.name === name)?.category === 'pastel'
            );
            if (currentPastels.length >= 2) {
              setNotification("Limite de 2 pastéis atingido.");
              return prev;
            }
          }

          if (item.category === 'beverage') {
            const currentBeverages = prev.filter(name => 
              currentMenu?.items.find(i => i.name === name)?.category === 'beverage'
            );
            if (currentBeverages.length >= 1) {
              // Replace beverage
              const withoutBeverages = prev.filter(name => 
                currentMenu?.items.find(i => i.name === name)?.category !== 'beverage'
              );
              return [...withoutBeverages, itemName];
            }
          }
        } else {
          // Selecting a Marmitex item, clear pastels
          const hasPastelItems = prev.some(name => 
            currentMenu?.items.find(i => i.name === name)?.category === 'pastel'
          );
          
          if (hasPastelItems) {
            const onlyMarmitexAndBeverages = prev.filter(name => 
              currentMenu?.items.find(i => i.name === name)?.category !== 'pastel'
            );
            prev = onlyMarmitexAndBeverages;
          }

          // Enforce "Only one" rule for protein, garnish and potato
          if (item.category === 'protein' || item.category === 'garnish' || item.category === 'potato') {
            const categoryNames = currentMenu?.items
              .filter(i => i.category === item.category)
              .map(i => i.name) || [];
            const withoutCategoryItems = prev.filter(i => !categoryNames.includes(i));
            return [...withoutCategoryItems, itemName];
          }

          // Enforce "Max 3" rule for accompaniment
          if (item.category === 'accompaniment') {
            const currentAccompaniments = prev.filter(selected => 
              currentMenu?.items.find(i => i.name === selected)?.category === 'accompaniment'
            );
            if (currentAccompaniments.length >= 3) {
              const firstAcc = currentAccompaniments[0];
              const withoutFirst = prev.filter(i => i !== firstAcc);
              return [...withoutFirst, itemName];
            }
          }
        }

        return [...prev, itemName];
      }
    });
  };

  const handleSubmitOrder = async () => {
    const trimmedName = userName.trim();
    
    let finalItems = selectedItems;
    if (orderMode === 'combo_pastel') {
      finalItems = [comboPastel1, comboPastel2, comboBeverage].filter(Boolean);
    }

    if (!trimmedName || !selectedSector || finalItems.length === 0 || currentMenu?.status === 'closed') return;

    if (orderMode === 'combo_pastel' && (!comboPastel1 || !comboPastel2 || !comboBeverage)) {
        setNotification("Por favor, selecione os 2 pastéis e a bebida do combo.");
        return;
    }

    // Validate name and surname
    const nameParts = trimmedName.split(/\s+/).filter(p => p.length > 0);
    if (nameParts.length < 2) {
      setNotification("Por favor, informe seu NOME e SOBRENOME.");
      return;
    }

    // Require delivery or pickup for dinner orders
    if (selectedPeriod === 'dinner' && !deliveryType) {
      setNotification("Por favor, selecione se deseja Entrega ou Retirada no restaurante.");
      return;
    }

    // Check for duplicate names in the same period/day
    const today = format(new Date(), 'yyyy-MM-dd');
    const hasDuplicate = allOrders.some(o => 
      o.userName.toLowerCase().trim() === trimmedName.toLowerCase() &&
      o.date === today &&
      o.period === selectedPeriod
    );

    if (hasDuplicate) {
      setNotification(`Já existe um pedido para "${trimmedName}" neste período.`);
      return;
    }

    const path = 'orders';
    setOrderStatus('submitting');
    try {
      await addDoc(collection(db, path), {
        userUid: user?.uid || null,
        userName: trimmedName,
        sector: selectedSector,
        items: finalItems,
        period: selectedPeriod,
        observation: orderObservation,
        date: today,
        timestamp: serverTimestamp(),
        status: 'active',
        deliveryType: selectedPeriod === 'dinner' ? deliveryType : null
      });
      setOrderStatus('success');
      setNotification(`Pedido de ${trimmedName} enviado com sucesso! Bom apetite!`);
      setSelectedItems([]);
      setComboPastel1('');
      setComboPastel2('');
      setComboBeverage('');
      setOrderObservation('');
      setUserName('');
      setDeliveryType('');
      setOrderMode(null);
      setTimeout(() => setOrderStatus('idle'), 3000);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
      setOrderStatus('error');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este pedido?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'orders');
    }
  };

  const [libraryItems, setLibraryItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'menus', 'library'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().items) {
        setLibraryItems(docSnap.data().items);
      }
    });
    return () => unsub();
  }, []);

  const exportOrders = (targetDate?: string) => {
    const finalDate = targetDate || format(new Date(), 'yyyy-MM-dd');
    // Apenas pedidos pendentes (ativos) por padrão para a cozinha, da data e período selecionados
    const activeOrders = allOrders.filter(o => 
      (o.status === 'active' || !o.status) && 
      o.date === finalDate &&
      o.period === selectedPeriod
    );

    if (activeOrders.length === 0) {
      setNotification(`Não há pedidos ativos para ${finalDate} no período ${selectedPeriod === 'lunch' ? 'Almoço' : 'Jantar'}.`);
      return;
    }

    const doc = new jsPDF();
    const [y, m, d] = finalDate.split('-');
    const dateStr = `${d}/${m}/${y}`;
    const periodStr = selectedPeriod === 'lunch' ? 'ALMOÇO' : 'JANTAR';

    // PDF Header
    doc.setFontSize(22);
    doc.setTextColor(44, 24, 16); // natural-accent color
    doc.text('Relatório de Pedidos - Refeitório', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data: ${dateStr} | Período: ${periodStr}`, 14, 30);
    doc.text(`Total de Pedidos: ${activeOrders.length}`, 14, 35);
    
    const itemCategoryMap: Record<string, string> = {};
    // Populate with library items for historical data
    libraryItems.forEach(it => {
      itemCategoryMap[it.name.trim().toLowerCase()] = it.category;
    });
    if (currentMenu) {
      currentMenu.items.forEach(it => {
        itemCategoryMap[it.name.trim().toLowerCase()] = it.category;
      });
    }

    const categoryOrder: Record<string, number> = {
      'protein': 0,
      'accompaniment': 1,
      'potato': 2,
      'garnish': 3,
      'extra': 4,
      'pastel': 5,
      'beverage': 6
    };

    const getCategoryLabel = (cat: string | undefined) => {
      if (!cat) return '[?]';
      switch (cat) {
        case 'protein': return '[P]';
        case 'accompaniment': return '[A]';
        case 'potato': return '[B]';
        case 'garnish': return '[G]';
        case 'extra': return '[#]';
        case 'pastel': return '[P]';
        case 'beverage': return '[D]';
        default: return '';
      }
    };

    const PDFGroups = Object.entries(
      activeOrders.reduce((acc, order) => {
        // Filtrar itens para a assinatura (Acompanhamento + Batatas)
        const signatureItems = order.items
          .filter(name => {
            const cat = itemCategoryMap[name.trim().toLowerCase()];
            return cat === 'accompaniment' || cat === 'potato';
          })
          .sort();
        
        const signature = signatureItems.join(' + ') || 'Sem base (Apenas complementos)';

        if (!acc[signature]) {
          acc[signature] = { count: 0, items: signatureItems, orders: [] };
        }
        acc[signature].count++;
        acc[signature].orders.push(order);
        return acc;
      }, {} as Record<string, { count: number, items: string[], orders: Order[] }>)
    ).sort((a, b) => (b[1] as any).count - (a[1] as any).count);

    let currentY = 45;

    PDFGroups.forEach((entry) => {
      const signature = entry[0];
      const group = entry[1] as { count: number, items: string[], orders: Order[] };
      // Check for page break - Increase threshold and check for table height if possible
      // but simpler: if we have less than 40 units left, might as well start fresh
      if (currentY > 210) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(44, 24, 16);
      doc.setFont("helvetica", "bold");
      doc.text(`${group.count}x Base: ${signature}`, 14, currentY);
      currentY += 6;

      const tableData = group.orders
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
        .map(order => {
          const topItems = order.items.filter(name => {
             const lowerName = name.trim().toLowerCase();
             const cat = itemCategoryMap[lowerName];
             // Filtrar Farofa apenas do PDF de montagem individual
             if (lowerName === 'farofa') return false;
             
             // If we don't know the category, INCLUDE it here so it's not lost
             if (!cat) return true;

             return cat === 'protein' || cat === 'garnish' || cat === 'extra' || cat === 'pastel' || cat === 'beverage';
          });

          // sort top items by category
          topItems.sort((a, b) => {
            const catA = itemCategoryMap[a.trim().toLowerCase()] || 'other';
            const catB = itemCategoryMap[b.trim().toLowerCase()] || 'other';
            return (categoryOrder[catA] ?? 99) - (categoryOrder[catB] ?? 99);
          });
          
          const itemsStr = topItems.map(it => {
              const cat = itemCategoryMap[it.trim().toLowerCase()];
              const label = getCategoryLabel(cat);
              return label ? `${it} ${label}` : it;
          }).join(', ');
          
          return [
            order.userName || '-',
            order.period === 'dinner' && order.deliveryType
              ? `${order.sector} (${order.deliveryType === 'entrega' ? 'Entrega' : 'Retirada'})`
              : order.sector,
            order.timestamp ? format(order.timestamp.toDate(), 'HH:mm') : '--:--',
            itemsStr,
            order.observation || '-'
          ];
        });

      autoTable(doc, {
        startY: currentY,
        head: [['Nome', 'Setor', 'H.', 'Mistura / Guarnição / Opcional', 'Obs.']],
        body: tableData,
        headStyles: { 
          fillColor: [44, 24, 16], 
          textColor: [255, 255, 255],
          fontSize: 12,
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [250, 248, 246] },
        styles: { 
          fontSize: 12, 
          cellPadding: 5,
          valign: 'middle',
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 'auto', fontStyle: 'bold' },
          4: { cellWidth: 30 }
        },
        pageBreak: 'avoid'
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;
    });

    // Summary Preparation
    doc.addPage();
    let currentYSummary = 20;

    doc.setFontSize(20);
    doc.setTextColor(44, 24, 16);
    doc.setFont("helvetica", "bold");
    doc.text('Resumo de Preparo (Quantidades Totais)', 14, currentYSummary);
    currentYSummary += 12;

    const itemQuantities = activeOrders.reduce((acc, order) => {
      order.items.forEach(item => {
        acc[item] = (acc[item] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const categoriesToPrint = [
      { id: 'protein', label: 'Proteínas' },
      { id: 'accompaniment', label: 'Acompanhamentos' },
      { id: 'potato', label: 'Batatas' },
      { id: 'garnish', label: 'Guarnições' },
      { id: 'extra', label: 'Opcionais' },
      { id: 'pastel', label: 'Pastéis' },
      { id: 'beverage', label: 'Bebidas' }
    ];

    const printedItems = new Set<string>();

    categoriesToPrint.forEach(cat => {
      const catItems = Object.entries(itemQuantities)
        .filter(([name]) => {
          const isMatch = itemCategoryMap[name.trim().toLowerCase()] === cat.id;
          if (isMatch) printedItems.add(name);
          return isMatch;
        })
        .sort((a, b) => (b[1] as number) - (a[1] as number));
      
      if (catItems.length > 0) {
        if (currentYSummary > 230) {
           doc.addPage();
           currentYSummary = 20;
        }

        autoTable(doc, {
            startY: currentYSummary,
            head: [[cat.label, 'Qtd']],
            body: catItems.map(([name, count]) => [name, `${count}x`]),
            headStyles: { fillColor: [240, 240, 240], textColor: [44, 24, 16], fontStyle: 'bold', fontSize: 14 },
            styles: { fontSize: 14, cellPadding: 4 },
            columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 30, fontStyle: 'bold' } },
            margin: { left: 14 },
            pageBreak: 'avoid'
        });
        currentYSummary = (doc as any).lastAutoTable.finalY + 8;
      }
    });

    // Handle items without category
    const otherItems = Object.entries(itemQuantities)
      .filter(([name]) => !printedItems.has(name))
      .sort((a, b) => (b[1] as number) - (a[1] as number));

    if (otherItems.length > 0) {
      if (currentYSummary > 230) {
         doc.addPage();
         currentYSummary = 20;
      }

      autoTable(doc, {
          startY: currentYSummary,
          head: [['Outros / Não Categorizados', 'Qtd']],
          body: otherItems.map(([name, count]) => [name, `${count}x`]),
          headStyles: { fillColor: [200, 200, 200], textColor: [44, 24, 16], fontStyle: 'bold', fontSize: 14 },
          styles: { fontSize: 14, cellPadding: 4 },
          columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 30, fontStyle: 'bold' } },
          margin: { left: 14 },
          pageBreak: 'avoid'
      });
      currentYSummary = (doc as any).lastAutoTable.finalY + 8;
    }

    if (currentYSummary > 240) {
       doc.addPage();
       currentYSummary = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(44, 24, 16);
    doc.setFont("helvetica", "bold");
    doc.text('Resumo por Setor:', 14, currentYSummary);
    
    const sectorsCount = activeOrders.reduce((acc, curr) => {
      acc[curr.sector] = (acc[curr.sector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    doc.setFont("helvetica", "normal");
    Object.entries(sectorsCount).forEach(([sector, count], index) => {
      doc.text(`• ${sector}: ${count} unidades`, 14, currentYSummary + 10 + (index * 8));
    });

    doc.save(`pedidos_${selectedPeriod}_${dateStr.replace(/\//g, '-')}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-natural-bg flex items-center justify-center">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-6"
        >
          <BrandLogo />
        </motion.div>
      </div>
    );
  }

  if (user && profile && !profile.isApproved) {
    return (
      <div className="min-h-screen bg-natural-bg flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-natural-card border border-natural-border p-12 rounded-[40px] text-center max-w-md shadow-2xl"
        >
          <div className="w-20 h-20 bg-natural-accent/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <Lock className="w-10 h-10 text-natural-accent" />
          </div>
          <h2 className="text-3xl font-serif italic text-natural-accent mb-4">Aguardando Aprovação</h2>
          <p className="text-natural-text-muted mb-8 leading-relaxed">
            Olá, <span className="font-bold text-natural-accent">{profile.name || profile.email}</span>. Sua conta foi criada com sucesso, mas ainda precisa ser aprovada por um administrador.
          </p>
          <div className="p-6 bg-natural-bg rounded-2xl border border-natural-border mb-8 text-left">
            <p className="text-[10px] uppercase font-bold text-natural-accent tracking-[2px] mb-4">O QUE FAZER AGORA?</p>
            <ul className="space-y-3">
              <li className="flex gap-3 text-xs text-natural-text-muted">
                <span className="text-natural-accent font-bold">1.</span>
                Fale com o responsável pelo restaurante.
              </li>
              <li className="flex gap-3 text-xs text-natural-text-muted">
                <span className="text-natural-accent font-bold">2.</span>
                Peça para aprovarem seu acesso no sistema.
              </li>
              <li className="flex gap-3 text-xs text-natural-text-muted">
                <span className="text-natural-accent font-bold">3.</span>
                Tente entrar novamente mais tarde.
              </li>
            </ul>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 bg-natural-text text-white py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sair da Conta
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text font-sans flex flex-col">
      <AnimatePresence>
        {notification && (
          <NotificationToast 
            message={notification} 
            onClose={() => setNotification(null)} 
          />
        )}
      </AnimatePresence>

      <Navbar user={user} profile={profile} onLogin={() => setIsLoginModalOpen(true)} onLogout={logout} setView={setView} />

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onLoginSuccess={(u, p) => { setUser(u); setProfile(p); setView('admin'); }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow">
        <div>
          {/* View Toggle (Admin Only) */}
          {profile?.role === 'admin' && (
            <div className="flex bg-natural-border/30 p-1.5 rounded-2xl w-full sm:w-fit mx-auto mb-10 border border-natural-border/50 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <button 
                onClick={() => setView('user')}
                className={cn(
                  "px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 text-sm shrink-0",
                  view === 'user' ? "bg-natural-card text-natural-accent shadow-sm" : "text-natural-text-muted hover:bg-natural-card/50"
                )}
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                Realizar Pedido
              </button>
              <button 
                onClick={() => { setView('admin'); setAdminSubView('orders'); }}
                className={cn(
                  "px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 text-sm shrink-0",
                  (view === 'admin' && adminSubView === 'orders') ? "bg-natural-card text-natural-accent shadow-sm" : "text-natural-text-muted hover:bg-natural-card/50"
                )}
              >
                <ListOrdered className="w-4 h-4 shrink-0" />
                Pedidos Recebidos
              </button>
              <button 
                onClick={() => { setView('admin'); setAdminSubView('menu'); }}
                className={cn(
                  "px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 text-sm shrink-0",
                  (view === 'admin' && adminSubView === 'menu') ? "bg-natural-card text-natural-accent shadow-sm" : "text-natural-text-muted hover:bg-natural-card/50"
                )}
              >
                <ChefHat className="w-4 h-4 shrink-0" />
                Configurar Cardápio
              </button>
            </div>
          )}

          {view === 'user' ? (
            <div className="grid lg:grid-cols-[1fr,320px] gap-10 items-start">
              {/* User Content */}
              <div className="space-y-10">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-natural-border pb-6 gap-4">
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-3xl font-serif text-natural-accent italic tracking-tight">
                        {userSubView === 'order' ? 'Seleção de Refeição' : 'Meus Pedidos'}
                      </h2>
                      <p className="text-natural-text-muted text-sm mt-1 uppercase tracking-wider font-bold">
                        {userSubView === 'order' ? 'Escolha seus itens preferidos do cardápio' : 'Consulte seu histórico de solicitações'}
                      </p>
                    </div>

                    <div className="flex bg-natural-bg p-1 rounded-xl border border-natural-border w-full sm:w-fit overflow-x-auto whitespace-nowrap scrollbar-hide shadow-sm">
                      <button 
                        onClick={() => setUserSubView('order')}
                        className={cn(
                          "px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                          userSubView === 'order' ? "bg-natural-accent text-white" : "text-natural-text-muted hover:bg-natural-accent/5"
                        )}
                      >
                        Cardápio
                      </button>
                      <button 
                        onClick={() => setUserSubView('history')}
                        className={cn(
                          "px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                          userSubView === 'history' ? "bg-natural-accent text-white" : "text-natural-text-muted hover:bg-natural-accent/5"
                        )}
                      >
                        Meu Histórico
                      </button>
                      <button 
                        onClick={() => setUserSubView('help')}
                        className={cn(
                          "px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                          userSubView === 'help' ? "bg-natural-accent text-white" : "text-natural-text-muted hover:bg-natural-accent/5"
                        )}
                      >
                        Ajuda
                      </button>
                    </div>
                  </div>

                  {userSubView === 'order' && (
                    /* Period Switcher */
                    <div className="flex gap-2 p-1.5 bg-natural-border/20 rounded-2xl border border-natural-border/30">
                      <button 
                        onClick={() => setSelectedPeriod('lunch')}
                        className={cn(
                          "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-tighter",
                          selectedPeriod === 'lunch' ? "bg-natural-accent text-white shadow-lg" : "text-natural-text-muted hover:bg-natural-border/40"
                        )}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Almoço
                      </button>
                      <button 
                        onClick={() => setSelectedPeriod('dinner')}
                        className={cn(
                          "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-tighter",
                          selectedPeriod === 'dinner' ? "bg-natural-accent text-white shadow-lg" : "text-natural-text-muted hover:bg-natural-border/40"
                        )}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Jantar
                      </button>
                    </div>
                  )}
                </header>

                {userSubView === 'order' ? (
                  !orderMode ? (
                    <div className="max-w-2xl mx-auto py-12 px-4">
                      <div className="text-center mb-12">
                        <h2 className="font-serif text-4xl text-natural-accent italic mb-4">O que você deseja hoje?</h2>
                        <p className="text-natural-text-muted font-medium uppercase tracking-widest text-[11px]">Escolha uma das opções abaixo para montar seu pedido</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <button 
                          id="marmitex-mode-btn"
                          onClick={() => {
                            setOrderMode('marmitex');
                            setSelectedItems([]);
                          }}
                          className="group relative bg-natural-card p-10 rounded-[40px] border-2 border-natural-border/50 hover:border-natural-accent transition-all duration-500 shadow-natural hover:shadow-natural-hover overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Utensils className="w-24 h-24 text-natural-accent" />
                          </div>
                          <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-natural-bg rounded-3xl flex items-center justify-center mb-6 border border-natural-border group-hover:scale-110 transition-transform duration-500">
                              <Utensils className="w-10 h-10 text-natural-accent" />
                            </div>
                            <h3 className="font-serif text-2xl text-natural-accent italic mb-2">Marmitex</h3>
                            <p className="text-sm text-natural-text-muted">Monte sua marmita com proteínas, guarnições e acompanhamentos.</p>
                          </div>
                        </button>

                        <button 
                          id="combo-pastel-mode-btn"
                          onClick={() => {
                            setOrderMode('combo_pastel');
                            setSelectedItems([]);
                          }}
                          className="group relative bg-natural-card p-10 rounded-[40px] border-2 border-natural-border/50 hover:border-natural-accent transition-all duration-500 shadow-natural hover:shadow-natural-hover overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ChefHat className="w-24 h-24 text-natural-accent" />
                          </div>
                          <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-natural-bg rounded-3xl flex items-center justify-center mb-6 border border-natural-border group-hover:scale-110 transition-transform duration-500">
                              <ChefHat className="w-10 h-10 text-natural-accent" />
                            </div>
                            <h3 className="font-serif text-2xl text-natural-accent italic mb-2">Combo Pastel</h3>
                            <p className="text-sm text-natural-text-muted">Aproveite nosso combo com 2 pastéis + 1 bebida (suco ou refrigerante).</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : currentMenu ? (
                    <div className="space-y-10">
                      <div className="flex items-center justify-between">
                        {currentMenu.isComboEnabled ? (
                          <button 
                            onClick={() => setOrderMode(null)}
                            className="flex items-center gap-2 text-natural-text-muted hover:text-natural-accent transition-colors text-xs font-bold uppercase tracking-tight group"
                          >
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Voltar para Seleção
                          </button>
                        ) : (
                          <div />
                        )}
                        <div className="bg-natural-accent/5 px-4 py-2 rounded-full border border-natural-accent/10">
                          <span className="text-[10px] font-bold text-natural-accent uppercase tracking-widest">
                            {orderMode === 'marmitex' ? 'Modo: Marmitex' : 'Modo: Combo Pastel'}
                          </span>
                        </div>
                      </div>

                      {orderMode === 'combo_pastel' && (
                        <div className="space-y-8">
                          {/* Pastel 1 */}
                          <div className="bg-natural-card rounded-[24px] p-8 shadow-natural border border-natural-border/50">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-8 border-b border-natural-border/30 pb-4">
                              <h3 className="font-serif text-2xl text-natural-accent italic">1º Pastel</h3>
                              <span className="text-[11px] font-bold text-natural-text-muted uppercase tracking-widest">Escolha o primeiro sabor</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {currentMenu.items.filter(i => i.category === 'pastel').map(item => (
                                <button
                                  key={`p1-${item.name}`}
                                  onClick={() => setComboPastel1(item.name)}
                                  className={cn(
                                    "p-4 rounded-2xl border-2 transition-all text-left text-sm font-bold",
                                    comboPastel1 === item.name 
                                      ? "bg-natural-accent border-natural-accent text-white shadow-lg" 
                                      : "bg-natural-bg border-natural-border text-natural-accent hover:border-natural-accent"
                                  )}
                                >
                                  {item.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Pastel 2 */}
                          <div className="bg-natural-card rounded-[24px] p-8 shadow-natural border border-natural-border/50">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-8 border-b border-natural-border/30 pb-4">
                              <h3 className="font-serif text-2xl text-natural-accent italic">2º Pastel</h3>
                              <span className="text-[11px] font-bold text-natural-text-muted uppercase tracking-widest">Escolha o segundo sabor (pode ser repetido)</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {currentMenu.items.filter(i => i.category === 'pastel').map(item => (
                                <button
                                  key={`p2-${item.name}`}
                                  onClick={() => setComboPastel2(item.name)}
                                  className={cn(
                                    "p-4 rounded-2xl border-2 transition-all text-left text-sm font-bold",
                                    comboPastel2 === item.name 
                                      ? "bg-natural-accent border-natural-accent text-white shadow-lg" 
                                      : "bg-natural-bg border-natural-border text-natural-accent hover:border-natural-accent"
                                  )}
                                >
                                  {item.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Beverage */}
                          <div className="bg-natural-card rounded-[24px] p-8 shadow-natural border border-natural-border/50">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-8 border-b border-natural-border/30 pb-4">
                              <h3 className="font-serif text-2xl text-natural-accent italic">Bebida do Combo</h3>
                              <span className="text-[11px] font-bold text-natural-text-muted uppercase tracking-widest">Suco ou Refrigerante</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                              {currentMenu.items.filter(i => i.category === 'beverage').map(item => (
                                <button
                                  key={`bev-${item.name}`}
                                  onClick={() => setComboBeverage(item.name)}
                                  className={cn(
                                    "p-4 rounded-2xl border-2 transition-all text-left text-sm font-bold",
                                    comboBeverage === item.name 
                                      ? "bg-natural-accent border-natural-accent text-white shadow-lg" 
                                      : "bg-natural-bg border-natural-border text-natural-accent hover:border-natural-accent"
                                  )}
                                >
                                  {item.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {orderMode === 'marmitex' && (['protein', 'accompaniment', 'potato', 'garnish', 'extra'] as const).map(cat => {
                        const items = currentMenu.items.filter(i => i.category === cat);
                        if (items.length === 0) return null;
                        
                        return (
                          <div key={cat} className="bg-natural-card rounded-[24px] p-8 shadow-natural border border-natural-border/50">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-8 border-b border-natural-border/30 pb-4">
                              <h3 className="font-serif text-2xl text-natural-accent italic">
                                {cat === 'protein' ? 'Proteínas' : cat === 'accompaniment' ? 'Acompanhamentos' : cat === 'potato' ? 'Batatas' : cat === 'garnish' ? 'Guarnições & Saladas' : 'Opcionais'}
                              </h3>
                              <span className="text-[11px] font-bold text-natural-text-muted uppercase tracking-widest">
                                {cat === 'protein' ? 'Escolha uma opção' : cat === 'accompaniment' ? 'Até 03 opções' : cat === 'potato' ? 'Escolha quantas desejar' : cat === 'garnish' ? 'Escolha uma opção' : 'Sim / Não'}
                              </span>
                            </div>
                            {currentMenu.status === 'closed' ? (
                              <div className="bg-natural-bg/50 border-2 border-dashed border-natural-border rounded-3xl p-12 text-center flex flex-col items-center gap-4">
                                <Lock className="w-8 h-8 text-natural-accent/30" />
                                <p className="text-natural-accent font-serif italic text-lg">O restaurante está fechado agora para solicitações</p>
                                <p className="text-xs text-natural-text-muted max-w-sm">No momento, não estamos aceitando novos pedidos. Por favor, retorne no próximo período de atendimento.</p>
                              </div>
                            ) : (
                              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {items.map(item => (
                                  <ItemCard 
                                    key={item.id} 
                                    item={item} 
                                    selected={selectedItems.includes(item.name)} 
                                    onToggle={() => handleToggleItem(item.name)} 
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-natural-card border border-natural-border rounded-[32px] p-24 text-center shadow-natural">
                      <ChefHat className="w-16 h-16 text-natural-border mx-auto mb-6" />
                      <p className="text-natural-accent font-serif italic text-2xl mb-2">Cardápio não definido</p>
                      <p className="text-natural-text-muted text-sm max-w-xs mx-auto">O administrador ainda não publicou o cardápio para este período.</p>
                    </div>
                  )
                ) : userSubView === 'history' ? (
                  /* User Order History */
                  <div className="space-y-6">
                    {allOrders
                      .filter(o => o.userUid === user?.uid)
                      .sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
                      .length > 0 ? (
                        allOrders
                          .filter(o => o.userUid === user?.uid)
                          .sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
                          .map(order => (
                            <div key={order.id} className="bg-natural-card p-6 rounded-[32px] border border-natural-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all">
                              <div className="flex-grow space-y-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold uppercase px-3 py-1 bg-natural-accent/5 text-natural-accent rounded-full border border-natural-accent/10 tracking-widest">
                                    {format(new Date(order.date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                                  </span>
                                  <span className="text-[10px] font-bold uppercase text-natural-text-muted italic serif">
                                    {order.period === 'lunch' ? 'Almoço' : 'Jantar'}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {order.items.map(it => (
                                    <span key={it} className="bg-natural-bg border border-natural-border text-natural-text-muted px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-tight">{it}</span>
                                  ))}
                                </div>
                              </div>
                              <button 
                               onClick={() => {
                                  setSelectedItems(order.items);
                                  setSelectedSector(order.sector);
                                  setUserName(order.userName);
                                  setOrderObservation(order.observation || '');
                                  setDeliveryType(order.deliveryType || '');
                                  setUserSubView('order');
                                  setNotification("Pedido carregado! Revise e clique em Confirmar.");
                                }}
                                className="flex items-center gap-2 bg-natural-accent text-white px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-natural-text shadow-lg hover:shadow-natural/20 transition-all active:scale-95"
                              >
                                <Plus className="w-4 h-4" />
                                Repetir Pedido
                              </button>
                            </div>
                          ))
                      ) : (
                        <div className="bg-natural-card border border-natural-border rounded-[32px] p-20 text-center shadow-inner">
                          <History className="w-12 h-12 text-natural-border mx-auto mb-4 opacity-30" />
                          <p className="text-natural-accent font-serif italic text-lg mb-2">Sem histórico</p>
                          <p className="text-natural-text-muted text-xs max-w-xs mx-auto uppercase tracking-widest font-bold">Você ainda não realizou pedidos no sistema.</p>
                        </div>
                      )}
                  </div>
                ) : (
                  /* User Help Section */
                  <div className="space-y-8">
                    <div className="bg-natural-card rounded-[32px] p-10 border border-natural-border shadow-sm">
                      <h3 className="text-3xl font-serif italic text-natural-accent mb-6">Como realizar seu pedido</h3>
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-natural-accent text-white flex items-center justify-center font-bold shrink-0">1</div>
                            <div>
                              <h4 className="font-bold text-natural-text mb-1">Escolha o Período</h4>
                              <p className="text-sm text-natural-text-muted italic">Selecione entre Almoço ou Jantar no topo da tela de pedidos.</p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-natural-accent text-white flex items-center justify-center font-bold shrink-0">2</div>
                            <div>
                              <h4 className="font-bold text-natural-text mb-1">Selecione os Itens</h4>
                              <p className="text-sm text-natural-text-muted italic">Você pode escolher exatamente uma proteína e quantos acompanhamentos desejar.</p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-natural-accent text-white flex items-center justify-center font-bold shrink-0">3</div>
                            <div>
                              <h4 className="font-bold text-natural-text mb-1">Revise seu Pedido</h4>
                              <p className="text-sm text-natural-text-muted italic">Confira na barra lateral os itens selecionados e adicione observações se necessário.</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-natural-accent text-white flex items-center justify-center font-bold shrink-0">4</div>
                            <div>
                              <h4 className="font-bold text-natural-text mb-1">Confirme o Envio</h4>
                              <p className="text-sm text-natural-text-muted italic">Clique no botão "Confirmar Pedido". Você receberá uma confirmação na tela.</p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-natural-accent text-white flex items-center justify-center font-bold shrink-0">5</div>
                            <div>
                              <h4 className="font-bold text-natural-text mb-1">Repita Pedidos</h4>
                              <p className="text-sm text-natural-text-muted italic">Na aba "Histórico", você pode ver seus pedidos passados e clicar em "Repetir Pedido" para agilizar.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-natural-accent/5 rounded-[32px] p-8 border border-natural-accent/10 flex items-start gap-4">
                      <AlertCircle className="w-6 h-6 text-natural-accent mt-1 shrink-0" />
                      <div>
                        <h4 className="font-bold text-natural-accent mb-2">Atenção aos Horários</h4>
                        <p className="text-sm text-natural-text-muted italic leading-relaxed">
                          O sistema possui horários de fechamento. Caso o botão de confirmação esteja desabilitado com um cadeado, 
                          significa que o restaurante encerrou as solicitações para este período.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Order Summary */}
              <div className="sticky top-28">
                <div className="bg-natural-accent rounded-[32px] p-8 text-white shadow-2xl shadow-natural/20 flex flex-col gap-10">
                  <h3 className="text-2xl font-serif italic mb-2 tracking-tight border-b border-white/10 pb-4">Seu Pedido</h3>
                  
                  <div className="space-y-8 flex-grow">
                    <div className="space-y-4">
                      <label className="text-[11px] font-bold uppercase tracking-[1px] text-white/60 block">Nome e Sobrenome</label>
                      <input 
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Ex: João Silva"
                        className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-sm font-medium outline-none focus:bg-white/20 transition-all placeholder:text-white/30"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-bold uppercase tracking-[1px] text-white/60 block">Setor de Atuação</label>
                      <div className="grid grid-cols-1 gap-2">
                        <select 
                          value={selectedSector}
                          onChange={(e) => setSelectedSector(e.target.value)}
                          className="bg-white/10 border border-white/20 rounded-xl p-4 text-sm font-medium outline-none focus:bg-white/20 transition-all w-full appearance-none cursor-pointer"
                        >
                          <option value="" className="text-natural-text">Selecione seu setor...</option>
                          {SECTORS.map(s => <option key={s} value={s} className="text-natural-text">{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {orderMode === 'combo_pastel' ? (
                        <>
                          <label className="text-[11px] font-bold uppercase tracking-[1px] text-white/60 block">Composição do Combo</label>
                          {(!comboPastel1 && !comboPastel2 && !comboBeverage) ? (
                            <div className="py-10 px-6 border border-white/10 border-dashed rounded-2xl flex flex-col items-center gap-3 bg-white/5">
                               <ShoppingCart className="w-6 h-6 text-white/20" />
                               <p className="text-white/30 text-[10px] uppercase font-bold text-center tracking-widest">Monte seu combo</p>
                            </div>
                          ) : (
                            <ul className="space-y-2">
                              {comboPastel1 && (
                                <li className="flex items-center justify-between bg-white/10 px-4 py-3 rounded-xl border border-white/5 backdrop-blur-sm group">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">1º Pastel</span>
                                    <span className="text-sm font-medium text-white/90">{comboPastel1}</span>
                                  </div>
                                  <button onClick={() => setComboPastel1('')} className="text-white/40 hover:text-white transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </li>
                              )}
                              {comboPastel2 && (
                                <li className="flex items-center justify-between bg-white/10 px-4 py-3 rounded-xl border border-white/5 backdrop-blur-sm group">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">2º Pastel</span>
                                    <span className="text-sm font-medium text-white/90">{comboPastel2}</span>
                                  </div>
                                  <button onClick={() => setComboPastel2('')} className="text-white/40 hover:text-white transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </li>
                              )}
                              {comboBeverage && (
                                <li className="flex items-center justify-between bg-white/10 px-4 py-3 rounded-xl border border-white/5 backdrop-blur-sm group">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Bebida</span>
                                    <span className="text-sm font-medium text-white/90">{comboBeverage}</span>
                                  </div>
                                  <button onClick={() => setComboBeverage('')} className="text-white/40 hover:text-white transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </li>
                              )}
                            </ul>
                          )}
                        </>
                      ) : (
                        <>
                          <label className="text-[11px] font-bold uppercase tracking-[1px] text-white/60 block">Composição da Marmita</label>
                          {selectedItems.length === 0 ? (
                            <div className="py-10 px-6 border border-white/10 border-dashed rounded-2xl flex flex-col items-center gap-3 bg-white/5">
                               <ShoppingCart className="w-6 h-6 text-white/20" />
                               <p className="text-white/30 text-[10px] uppercase font-bold text-center tracking-widest">Monte sua marmita</p>
                            </div>
                          ) : (
                            <ul className="space-y-2">
                              {selectedItems.map(item => (
                                <li key={item} className="flex items-center justify-between bg-white/10 px-4 py-3 rounded-xl border border-white/5 backdrop-blur-sm group">
                                  <span className="text-sm font-medium text-white/90">{item}</span>
                                  <button onClick={() => handleToggleItem(item)} className="text-white/40 hover:text-white transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>

                    {selectedPeriod === 'dinner' && (
                      <div className="space-y-4">
                        <label className="text-[11px] font-bold uppercase tracking-[1px] text-white/60 block">
                          Forma de Recebimento <span className="text-amber-300 font-bold">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setDeliveryType('entrega')}
                            className={cn(
                              "flex flex-col items-center justify-center p-4 rounded-xl border transition-all gap-1.5 focus:outline-none cursor-pointer",
                              deliveryType === 'entrega'
                                ? "bg-white text-natural-accent border-white shadow-lg font-bold scale-[1.02]"
                                : "bg-white/5 text-white/75 border-white/10 hover:bg-white/10"
                            )}
                          >
                            <Truck className={cn("w-5 h-5", deliveryType === 'entrega' ? "text-natural-accent" : "text-white/60")} />
                            <span className="text-xs uppercase tracking-wider font-bold">Entrega</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeliveryType('retirada')}
                            className={cn(
                              "flex flex-col items-center justify-center p-4 rounded-xl border transition-all gap-1.5 focus:outline-none cursor-pointer",
                              deliveryType === 'retirada'
                                ? "bg-white text-natural-accent border-white shadow-lg font-bold scale-[1.02]"
                                : "bg-white/5 text-white/75 border-white/10 hover:bg-white/10"
                            )}
                          >
                            <Store className={cn("w-5 h-5", deliveryType === 'retirada' ? "text-natural-accent" : "text-white/60")} />
                            <span className="text-xs uppercase tracking-wider font-bold">Retirada</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-white/50 italic">
                          * Seleção obrigatória para pedidos do jantar.
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <label className="text-[11px] font-bold uppercase tracking-[1px] text-white/60 block">Observações (Opcional)</label>
                      <textarea 
                        value={orderObservation}
                        onChange={(e) => setOrderObservation(e.target.value)}
                        placeholder="Ex: Sem cebola, caprichar no feijão..."
                        rows={2}
                        className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-sm font-medium outline-none focus:bg-white/20 transition-all resize-none placeholder:text-white/30"
                      />
                    </div>

                    <div className="pt-6 border-t border-white/10">
                      <button 
                        disabled={
                          !userName.trim() || 
                          !selectedSector || 
                          orderStatus === 'submitting' || 
                          currentMenu?.status === 'closed' ||
                          (selectedPeriod === 'dinner' && !deliveryType) ||
                          (orderMode === 'combo_pastel' 
                            ? (!comboPastel1 || !comboPastel2 || !comboBeverage)
                            : selectedItems.length === 0)
                        }
                        onClick={handleSubmitOrder}
                        className={cn(
                          "w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3",
                          (!userName.trim() || 
                          !selectedSector || 
                          orderStatus === 'submitting' || 
                          currentMenu?.status === 'closed' ||
                          (selectedPeriod === 'dinner' && !deliveryType) ||
                          (orderMode === 'combo_pastel' 
                            ? (!comboPastel1 || !comboPastel2 || !comboBeverage)
                            : selectedItems.length === 0))
                            ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/10"
                            : "bg-white text-natural-accent hover:shadow-2xl hover:bg-natural-bg active:scale-[0.98]"
                        )}
                      >
                        {orderStatus === 'submitting' ? "Enviando..." : currentMenu?.status === 'closed' ? <><Lock className="w-4 h-4" /> Fechado</> : "Confirmar Pedido"}
                      </button>

                      <AnimatePresence>
                        {orderStatus === 'success' && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="mt-6 bg-natural-accent-light/30 border border-white/10 p-4 rounded-xl flex items-center gap-3"
                          >
                            <CheckCircle2 className="w-5 h-5 text-white/80" />
                            <span className="text-[11px] font-bold font-sans tracking-tight uppercase text-white/90">Enviado com sucesso!</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {profile?.role === 'admin' ? (
                <AdminDashboard 
                  allOrders={allOrders} 
                  exportOrders={exportOrders} 
                  onDeleteOrder={handleDeleteOrder}
                  currentMenu={currentMenu}
                  libraryItems={libraryItems}
                  selectedPeriod={selectedPeriod}
                  setSelectedPeriod={setSelectedPeriod}
                  subView={adminSubView}
                  setSubView={setAdminSubView}
                  notifPermission={notifPermission}
                  requestNotifPermission={requestNotifPermission}
                  testNotifications={testNotifications}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="bg-natural-card border border-natural-border p-12 rounded-[40px] text-center max-w-md shadow-natural">
                    <AlertCircle className="w-12 h-12 text-natural-accent mx-auto mb-6" />
                    <h3 className="text-2xl font-serif italic text-natural-accent mb-4">Acesso Exclusivo</h3>
                    <p className="text-natural-text-muted mb-8 italic">Para acessar as ferramentas de gestão, você precisa estar autenticado como administrador.</p>
                    <button 
                      onClick={() => setIsLoginModalOpen(true)}
                      className="w-full flex items-center justify-center gap-3 bg-natural-accent text-white py-4 rounded-2xl font-bold hover:bg-natural-text transition-all"
                    >
                      <LogIn className="w-5 h-5" />
                      Login Administrativo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

interface ItemCardProps {
  key?: React.Key;
  item: MenuItem;
  selected: boolean;
  onToggle: () => void;
}

function CategoryIcon({ category, className }: { category: string, className?: string }) {
  switch (category) {
    case 'protein':
      return <Flame className={className} />;
    case 'accompaniment':
      return <Utensils className={className} />;
    case 'garnish':
      return <Leaf className={className} />;
    case 'pastel':
      return <ChefHat className={className} />; // Or an icon for pastel if available
    case 'beverage':
      return <ShoppingCart className={className} />; // Or generic drink icon
    default:
      return <ChefHat className={className} />;
  }
}

function ItemCard({ item, selected, onToggle }: ItemCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={cn(
        "relative rounded-2xl p-4 border-2 cursor-pointer transition-all flex items-center gap-4",
        selected 
          ? "bg-[#F4F3EC] border-natural-accent text-natural-accent shadow-md shadow-natural/5" 
          : "bg-natural-card border-natural-border hover:border-natural-accent-light group shadow-sm hover:shadow-md"
      )}
    >
      {item.imageUrl ? (
        <img 
          src={item.imageUrl} 
          alt={item.name} 
          referrerPolicy="no-referrer"
          className="w-14 h-14 rounded-xl object-cover border border-natural-border"
        />
      ) : (
        <div className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center",
          selected ? "bg-natural-accent/10" : "bg-natural-border/20 group-hover:bg-natural-border/40"
        )}>
          {selected ? (
            <CheckCircle2 className="w-6 h-6 text-natural-accent" />
          ) : (
            <CategoryIcon category={item.category} className="w-6 h-6 text-natural-accent/40" />
          )}
        </div>
      )}
      <div className="flex-1">
        <h4 className="font-bold text-sm text-natural-text leading-tight">{item.name}</h4>
        {item.description && (
          <p className={cn(
            "text-[11px] mt-0.5 leading-relaxed line-clamp-1",
            selected ? "text-natural-accent/70" : "text-natural-text-muted"
          )}>
            {item.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      const u = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(u);
      setLoading(false);
    });
  }, []);

  const toggleApproval = async (user: UserProfile) => {
    try {
      await setDoc(doc(db, 'users', user.uid), { ...user, isApproved: !user.isApproved });
    } catch (e) {
      console.error("Error toggling approval:", e);
    }
  };

  const toggleRole = async (user: UserProfile) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await setDoc(doc(db, 'users', user.uid), { ...user, role: newRole });
    } catch (e) {
      console.error("Error toggling role:", e);
    }
  };

  const deleteUser = async (uid: string) => {
    if (!confirm("Tem certeza que deseja remover este usuário?")) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
      console.error("Error deleting user:", e);
    }
  };

  if (loading) return (
    <div className="py-10 text-center">
      <div className="animate-spin w-6 h-6 border-2 border-natural-accent border-t-transparent rounded-full mx-auto"></div>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-natural-border pb-4">
            <th className="text-[10px] font-bold uppercase tracking-widest p-4">Usuário</th>
            <th className="text-[10px] font-bold uppercase tracking-widest p-4 text-center">Status</th>
            <th className="text-[10px] font-bold uppercase tracking-widest p-4 text-center">Permissão</th>
            <th className="text-[10px] font-bold uppercase tracking-widest p-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-natural-border/30">
          {users.map(u => (
            <tr key={u.uid} className="group hover:bg-natural-bg/50 transition-colors">
              <td className="p-4">
                <div className="flex flex-col">
                  <span className="font-bold text-natural-text text-sm">{u.name || 'Sem nome'}</span>
                  <span className="text-xs text-natural-text-muted">{u.email}</span>
                </div>
              </td>
              <td className="p-4 text-center">
                <button 
                  onClick={() => toggleApproval(u)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                    u.isApproved 
                      ? "bg-green-50 text-green-700 border-green-200" 
                      : "bg-orange-50 text-orange-700 border-orange-200"
                  )}
                >
                  {u.isApproved ? 'Aprovado' : 'Pendente'}
                </button>
              </td>
              <td className="p-4 text-center">
                <button 
                  onClick={() => toggleRole(u)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                    u.role === 'admin'
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  )}
                >
                  {u.role === 'admin' ? 'Administrador' : 'Usuário Comum'}
                </button>
              </td>
              <td className="p-4 text-right">
                <button 
                  onClick={() => deleteUser(u.uid)}
                  className="p-2 text-red-300 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                  title="Remover Usuário"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <div className="py-20 text-center opacity-40 italic text-sm">Nenhum usuário cadastrado.</div>
      )}
    </div>
  );
}

// --- Admin Section ---

function SortableMenuItem({ 
  item, 
  onDelete 
}: { 
  item: MenuItem, 
  onDelete: (id: string) => void | Promise<void>,
  key?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "flex items-center justify-between p-5 bg-natural-bg rounded-2xl group border border-natural-border transition-all",
        isDragging && "opacity-50 shadow-2xl border-natural-accent shadow-natural/20"
      )}
    >
      <div className="flex items-center gap-4">
        <button 
          {...attributes} 
          {...listeners} 
          className="p-1.5 text-natural-text-muted hover:text-natural-accent cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.name} 
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover border border-natural-border"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-white border border-natural-border flex items-center justify-center">
            <CategoryIcon category={item.category} className="w-5 h-5 text-natural-accent/40" />
          </div>
        )}
        <div>
          <h5 className="font-bold text-natural-text group-hover:text-natural-accent-light transition-colors italic serif">{item.name}</h5>
          <span className="text-[10px] font-bold text-natural-text-muted uppercase tracking-widest">{item.category}</span>
        </div>
      </div>
      <button onClick={() => onDelete(item.id)} className="p-2 text-natural-text-muted hover:text-red-700 hover:bg-red-50 rounded-full transition-all md:opacity-0 group-hover:opacity-100">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function AdminDashboard({ 
  allOrders, 
  exportOrders, 
  onDeleteOrder,
  currentMenu,
  libraryItems,
  selectedPeriod,
  setSelectedPeriod,
  subView,
  setSubView,
  notifPermission,
  requestNotifPermission,
  testNotifications
}: { 
  allOrders: Order[], 
  exportOrders: (targetDate?: string) => void, 
  onDeleteOrder: (id: string) => void,
  currentMenu: DailyMenu | null,
  libraryItems: MenuItem[],
  selectedPeriod: Period,
  setSelectedPeriod: (p: Period) => void,
  subView: 'dashboard' | 'orders' | 'menu' | 'history' | 'users' | 'help',
  setSubView: (v: 'dashboard' | 'orders' | 'menu' | 'history' | 'users' | 'help') => void,
  notifPermission: NotificationPermission,
  requestNotifPermission: () => void,
  testNotifications: () => void
}) {
  const [editingMenu, setEditingMenu] = useState<Partial<MenuItem>>({ name: '', category: 'protein', description: '', imageUrl: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [editingLibraryItemId, setEditingLibraryItemId] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [nameFilter, setNameFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState(subView === 'history' ? '' : format(new Date(), 'yyyy-MM-dd'));
  const [endDateFilter, setEndDateFilter] = useState(subView === 'history' ? '' : format(new Date(), 'yyyy-MM-dd'));
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>(subView === 'history' ? 'archived' : 'active');
  const [isLibraryView, setIsLibraryView] = useState(false);
  const [orderViewMode, setOrderViewMode] = useState<'individual' | 'assembly'>('individual');

  useEffect(() => {
    setStatusFilter(subView === 'history' ? 'archived' : 'active');
    if (subView === 'orders') {
      if (!startDateFilter) setStartDateFilter(format(new Date(), 'yyyy-MM-dd'));
      if (!endDateFilter) setEndDateFilter(format(new Date(), 'yyyy-MM-dd'));
    } else if (subView === 'history') {
      setStartDateFilter('');
      setEndDateFilter('');
    }
  }, [subView]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredOrders = allOrders.filter(o => {
    const matchesSector = sectorFilter === 'all' || o.sector === sectorFilter;
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'active' 
        ? (o.status === 'active' || !o.status) 
        : o.status === 'archived';
    const matchesDate = 
      (!startDateFilter || o.date >= startDateFilter) &&
      (!endDateFilter || o.date <= endDateFilter);
    const matchesName = !nameFilter || o.userName?.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesPeriod = o.period === selectedPeriod;
    return matchesSector && matchesStatus && matchesDate && matchesName && matchesPeriod;
  });

  const itemToCategory: Record<string, string> = {};
  // First populate with library items to have historical data
  libraryItems.forEach(it => {
    itemToCategory[it.name.trim().toLowerCase()] = it.category;
  });
  // Then current menu items to ensure they are up to date (though they should match library)
  currentMenu?.items.forEach(it => {
    itemToCategory[it.name.trim().toLowerCase()] = it.category;
  });

  const itemQuantities = filteredOrders.reduce((acc, order) => {
    order.items.forEach(item => {
      acc[item] = (acc[item] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const categoryLabels: Record<string, string> = {
    'protein': 'Proteínas',
    'accompaniment': 'Acompanhamentos',
    'potato': 'Batatas',
    'garnish': 'Guarnições',
    'extra': 'Opcionais',
    'pastel': 'Pastéis',
    'beverage': 'Bebidas'
  };

  const exportFilteredReport = () => {
    if (filteredOrders.length === 0) {
      alert("Não há pedidos para exportar com os filtros atuais.");
      return;
    }

    const doc = new jsPDF();
    const startDateStr = startDateFilter ? startDateFilter.split('-').reverse().join('/') : 'Início';
    const endDateStr = endDateFilter ? endDateFilter.split('-').reverse().join('/') : 'Fim';
    const periodStr = selectedPeriod === 'lunch' ? 'ALMOÇO' : 'JANTAR';

    // Header
    doc.setFontSize(22);
    doc.setTextColor(44, 24, 16);
    doc.text('Relatório de Pedidos Filtrado', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período dos Filtros: ${startDateStr} até ${endDateStr} | Turno: ${periodStr}`, 14, 30);
    doc.text(`Setor: ${sectorFilter === 'all' ? 'Todos' : sectorFilter} | Status: ${statusFilter === 'all' ? 'Todos' : (statusFilter === 'active' ? 'Ativos' : 'Arquivados')}`, 14, 35);
    doc.text(`Total de Pedidos Encontrados: ${filteredOrders.length}`, 14, 40);

    const categoryOrder: Record<string, number> = {
      'protein': 0,
      'accompaniment': 1,
      'potato': 2,
      'garnish': 3,
      'extra': 4,
      'pastel': 5,
      'beverage': 6
    };

    const getCategoryLabel = (cat: string | undefined) => {
      if (!cat) return '[?]';
      switch (cat) {
        case 'protein': return '[P]';
        case 'accompaniment': return '[A]';
        case 'potato': return '[B]';
        case 'garnish': return '[G]';
        case 'extra': return '[#]';
        case 'pastel': return '[P]';
        case 'beverage': return '[D]';
        default: return '';
      }
    };

    const tableData = filteredOrders
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0);
      })
      .map(order => {
        const topItems = order.items.filter(name => {
           const lowerName = name.trim().toLowerCase();
           const cat = itemToCategory[lowerName];
           if (lowerName === 'farofa') return false;
           if (!cat) return true;
           return cat === 'protein' || cat === 'garnish' || cat === 'extra' || cat === 'pastel' || cat === 'beverage' || cat === 'accompaniment' || cat === 'potato';
        });

        topItems.sort((a, b) => {
          const catA = itemToCategory[a.trim().toLowerCase()] || 'other';
          const catB = itemToCategory[b.trim().toLowerCase()] || 'other';
          return (categoryOrder[catA] ?? 99) - (categoryOrder[catB] ?? 99);
        });
        
        const itemsStr = topItems.map(it => {
            const cat = itemToCategory[it.trim().toLowerCase()];
            const label = getCategoryLabel(cat);
            return label ? `${it} ${label}` : it;
        }).join(', ');

        const orderDateStr = order.date.split('-').reverse().join('/');
        
        let timeStr = '--:--';
        if (order.timestamp) {
          try {
            if (typeof order.timestamp.toDate === 'function') {
              timeStr = format(order.timestamp.toDate(), 'HH:mm');
            } else if (order.timestamp instanceof Date) {
              timeStr = format(order.timestamp, 'HH:mm');
            } else if (typeof order.timestamp === 'string') {
              timeStr = format(new Date(order.timestamp), 'HH:mm');
            }
          } catch (e) {
            console.error(e);
          }
        }

        return [
          orderDateStr,
          order.userName || '-',
          order.period === 'dinner' && order.deliveryType
            ? `${order.sector} (${order.deliveryType === 'entrega' ? 'Entrega' : 'Retirada'})`
            : order.sector,
          timeStr,
          itemsStr,
          order.observation || '-'
        ];
      });

    autoTable(doc, {
      startY: 48,
      head: [['Data', 'Nome', 'Setor', 'H.', 'Itens do Pedido', 'Obs.']],
      body: tableData,
      headStyles: { 
        fillColor: [44, 24, 16], 
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [250, 248, 246] },
      styles: { 
        fontSize: 10, 
        cellPadding: 4,
        valign: 'middle',
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 15 },
        4: { cellWidth: 'auto', fontStyle: 'bold' },
        5: { cellWidth: 25 }
      }
    });

    let currentYSummary = (doc as any).lastAutoTable.finalY + 12;

    if (currentYSummary > 200) {
      doc.addPage();
      currentYSummary = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(44, 24, 16);
    doc.setFont("helvetica", "bold");
    doc.text('Resumo Acumulado do Período', 14, currentYSummary);
    currentYSummary += 10;

    const categoriesToPrint = [
      { id: 'protein', label: 'Proteínas' },
      { id: 'accompaniment', label: 'Acompanhamentos' },
      { id: 'potato', label: 'Batatas' },
      { id: 'garnish', label: 'Guarnições' },
      { id: 'extra', label: 'Opcionais' },
      { id: 'pastel', label: 'Pastéis' },
      { id: 'beverage', label: 'Bebidas' }
    ];

    const printedItems = new Set<string>();

    categoriesToPrint.forEach(cat => {
      const catItems = Object.entries(itemQuantities)
        .filter(([name]) => {
          const isMatch = itemToCategory[name.trim().toLowerCase()] === cat.id;
          if (isMatch) printedItems.add(name);
          return isMatch;
        })
        .sort((a, b) => (b[1] as number) - (a[1] as number));
      
      if (catItems.length > 0) {
        if (currentYSummary > 230) {
           doc.addPage();
           currentYSummary = 20;
        }

        autoTable(doc, {
            startY: currentYSummary,
            head: [[cat.label, 'Qtd']],
            body: catItems.map(([name, count]) => [name, `${count}x`]),
            headStyles: { fillColor: [240, 240, 240], textColor: [44, 24, 16], fontStyle: 'bold', fontSize: 11 },
            styles: { fontSize: 11, cellPadding: 3 },
            columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 30, fontStyle: 'bold' } },
            margin: { left: 14 },
            pageBreak: 'avoid'
        });
        currentYSummary = (doc as any).lastAutoTable.finalY + 6;
      }
    });

    // Handle items without category
    const otherItems = Object.entries(itemQuantities)
      .filter(([name]) => !printedItems.has(name))
      .sort((a, b) => (b[1] as number) - (a[1] as number));

    if (otherItems.length > 0) {
      if (currentYSummary > 230) {
         doc.addPage();
         currentYSummary = 20;
      }

      autoTable(doc, {
          startY: currentYSummary,
          head: [['Outros / Não Categorizados', 'Qtd']],
          body: otherItems.map(([name, count]) => [name, `${count}x`]),
          headStyles: { fillColor: [200, 200, 200], textColor: [44, 24, 16], fontStyle: 'bold', fontSize: 11 },
          styles: { fontSize: 11, cellPadding: 3 },
          columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 30, fontStyle: 'bold' } },
          margin: { left: 14 },
          pageBreak: 'avoid'
      });
      currentYSummary = (doc as any).lastAutoTable.finalY + 6;
    }

    doc.save(`relatorio_copilado_pedidos_${startDateStr.replace(/\//g, '-')}_a_${endDateStr.replace(/\//g, '-')}.pdf`);
  };

  const assemblyGroups = Object.entries(
    filteredOrders.reduce((acc, order) => {
      // Filtrar itens para a assinatura (Acompanhamento + Batatas)
      const signatureItems = order.items
        .filter(name => {
          const cat = itemToCategory[name.trim().toLowerCase()];
          return cat === 'accompaniment' || cat === 'potato';
        })
        .sort();
      
      const signature = signatureItems.join(' + ') || 'Sem base';

      if (!acc[signature]) {
        acc[signature] = { count: 0, items: signatureItems, orders: [] };
      }
      acc[signature].count++;
      acc[signature].orders.push(order);
      return acc;
    }, {} as Record<string, { count: number, items: string[], orders: Order[] }>)
  ).sort((a, b) => b[1].count - a[1].count);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!currentMenu || !over || active.id === over.id) return;

    const oldIndex = currentMenu.items.findIndex((item) => item.id === active.id);
    const newIndex = currentMenu.items.findIndex((item) => item.id === over.id);

    const reorderedItems = arrayMove(currentMenu.items, oldIndex, newIndex);
    const path = `menus/${currentMenu.id}`;
    const menuRef = doc(db, 'menus', currentMenu.id);

    try {
      await setDoc(menuRef, {
        ...currentMenu,
        items: reorderedItems
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const toggleMenuStatus = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const menuId = `${today}_${selectedPeriod}`;
    const path = `menus/${menuId}`;
    const menuRef = doc(db, 'menus', menuId);
    
    try {
      if (!currentMenu) {
        // Initialize if doesn't exist
        await setDoc(menuRef, {
          id: menuId,
          date: today,
          period: selectedPeriod,
          items: [],
          status: 'closed' // Start as closed if initializing from toggle
        });
      } else {
        await setDoc(menuRef, {
          ...currentMenu,
          status: currentMenu.status === 'open' ? 'closed' : 'open'
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const toggleComboStatus = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const menuId = `${today}_${selectedPeriod}`;
    const path = `menus/${menuId}`;
    const menuRef = doc(db, 'menus', menuId);
    
    try {
      if (!currentMenu) {
        await setDoc(menuRef, {
          id: menuId,
          date: today,
          period: selectedPeriod,
          items: [],
          status: 'open',
          isComboEnabled: true
        });
      } else {
        await setDoc(menuRef, {
          ...currentMenu,
          isComboEnabled: !currentMenu.isComboEnabled
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const clearMenu = async () => {
    const targetDate = startDateFilter || format(new Date(), 'yyyy-MM-dd');
    const menuId = `${targetDate}_${selectedPeriod}`;
    const path = `menus/${menuId}`;
    const menuRef = doc(db, 'menus', menuId);
    
    try {
      const batch = writeBatch(db);

      // 1. Reset Menu Items and status for the specific date/period
      batch.set(menuRef, {
        id: menuId,
        date: targetDate,
        period: selectedPeriod,
        items: [],
        status: 'open'
      }, { merge: true });

      // 2. Archive Orders for this date and period
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, 
        where('date', '==', targetDate),
        where('period', '==', selectedPeriod),
        where('status', '==', 'active')
      );
      
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { status: 'archived' });
      });
      
      await batch.commit();
      setShowClearConfirm(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const handleAddMenuItem = async () => {
    if (!editingMenu.name) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const menuId = `${today}_${selectedPeriod}`;
    const path = `menus/${menuId}`;
    const menuRef = doc(db, 'menus', menuId);
    const libraryRef = doc(db, 'menus', 'library');

    try {
      if (editingLibraryItemId) {
        // Edit existing item
        const updatedItem: MenuItem = {
          id: editingLibraryItemId,
          name: editingMenu.name,
          category: editingMenu.category as any,
          description: editingMenu.description || '',
          imageUrl: editingMenu.imageUrl || ''
        };

        const updatedLibrary = libraryItems.map(i => i.id === editingLibraryItemId ? updatedItem : i);
        await setDoc(libraryRef, { items: updatedLibrary }, { merge: true });

        // Update current daily menu if present
        if (currentMenu && currentMenu.items.some(i => i.id === editingLibraryItemId)) {
          const updatedActive = currentMenu.items.map(i => i.id === editingLibraryItemId ? updatedItem : i);
          await setDoc(menuRef, { ...currentMenu, items: updatedActive }, { merge: true });
        }
      } else {
        // Create new item
        const newItem: MenuItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: editingMenu.name,
          category: editingMenu.category as any,
          description: editingMenu.description || '',
          imageUrl: editingMenu.imageUrl || ''
        };

        const updatedItems = currentMenu ? [...currentMenu.items, newItem] : [newItem];
        
        await setDoc(menuRef, {
          id: menuId,
          date: today,
          period: selectedPeriod,
          items: updatedItems,
          status: currentMenu?.status || 'open',
          isComboEnabled: currentMenu?.isComboEnabled ?? false
        });

        // Also save to library
        await setDoc(libraryRef, {
          items: [...libraryItems, newItem]
        }, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }

    setEditingMenu({ name: '', category: 'protein', description: '', imageUrl: '' });
    setEditingLibraryItemId(null);
    setIsAdding(false);
  };

  const handleDeleteLibraryItem = async (itemId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const menuId = `${today}_${selectedPeriod}`;
    const menuRef = doc(db, 'menus', menuId);
    const libraryRef = doc(db, 'menus', 'library');

    if (!window.confirm('Tem certeza que deseja apagar este item permanentemente do acervo?')) return;

    try {
      const updatedLibrary = libraryItems.filter(i => i.id !== itemId);
      await setDoc(libraryRef, { items: updatedLibrary }, { merge: true });

      if (currentMenu && currentMenu.items.some(i => i.id === itemId)) {
        const updatedActive = currentMenu.items.filter(i => i.id !== itemId);
        await setDoc(menuRef, { ...currentMenu, items: updatedActive }, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'menus');
    }
  };

  const toggleLibraryItem = async (item: MenuItem, isActive: boolean) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const menuId = `${today}_${selectedPeriod}`;
    const menuRef = doc(db, 'menus', menuId);

    let updatedItems = currentMenu?.items || [];
    
    if (isActive) {
      // Add to menu
      if (!updatedItems.find(i => i.id === item.id)) {
        updatedItems = [...updatedItems, item];
      }
    } else {
      // Remove from menu
      updatedItems = updatedItems.filter(i => i.id !== item.id);
    }

    try {
      await setDoc(menuRef, {
        id: menuId,
        date: today,
        period: selectedPeriod,
        items: updatedItems,
        status: currentMenu?.status || 'open'
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `menus/${menuId}`);
    }
  };

  const seedDailyMenu = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const menuId = `${today}_${selectedPeriod}`;
    const path = `menus/${menuId}`;
    const menuRef = doc(db, 'menus', menuId);
    const libraryRef = doc(db, 'menus', 'library');

    const suggestions: MenuItem[] = [
      { id: 'seed1', name: 'Arroz Branco Soltinho', category: 'accompaniment', description: 'Arroz agulhinha de primeira' },
      { id: 'seed2', name: 'Feijão Carioca Caseiro', category: 'accompaniment', description: 'Temperado com alho e louro' },
      { id: 'seed3', name: 'Batata Frita', category: 'potato', description: 'Crocante' },
      { id: 'seed3b', name: 'Batata Doce Assada', category: 'potato', description: 'Com ervas' },
      { id: 'seed4', name: 'Bife de Contrafilé', category: 'protein', description: 'Grelhado na hora' },
      { id: 'seed5', name: 'Frango Grelhado', category: 'protein', description: 'Filé de frango temperado' },
      { id: 'seed6', name: 'Salada de Alface e Tomate', category: 'garnish', description: 'Com azeite e sal' },
      { id: 'seed7', name: 'Farofa de Ovos', category: 'extra', description: 'Misturada na hora' },
      { id: 'seed8', name: 'Talheres Descartáveis', category: 'extra', description: 'Garfo, faca e guardanapo' },
    ];

    try {
      await setDoc(menuRef, {
        id: menuId,
        date: today,
        period: selectedPeriod,
        items: suggestions,
        status: 'open',
        isComboEnabled: false
      });

      // Merge into library missing items
      const existingIds = new Set(libraryItems.map(i => i.id));
      const newItemsForLibrary = suggestions.filter(s => !existingIds.has(s.id));
      
      if (newItemsForLibrary.length > 0) {
        await setDoc(libraryRef, {
          items: [...libraryItems, ...newItemsForLibrary]
        }, { merge: true });
      }

    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!currentMenu) return;
    const path = `menus/${currentMenu.id}`;
    const menuRef = doc(db, 'menus', currentMenu.id);
    try {
      await setDoc(menuRef, {
        ...currentMenu,
        items: currentMenu.items.filter(i => i.id !== itemId)
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-8 border-b border-natural-border pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <BrandLogo className="scale-75 origin-left" />
            <div className="hidden sm:block h-12 w-px bg-natural-border mx-2"></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-natural-accent mb-1">Painel Victor</p>
              <h2 className="text-3xl font-serif text-natural-accent italic leading-none">Gestão</h2>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-natural-bg/50 p-2 rounded-2xl border border-natural-border/30">
            <p className="text-[10px] font-bold uppercase tracking-widest text-natural-text-muted px-2">Gerir Período:</p>
            <div className="flex bg-natural-bg p-1 rounded-xl border border-natural-border shadow-sm">
              <button 
                onClick={() => setSelectedPeriod('lunch')}
                className={cn(
                  "px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  selectedPeriod === 'lunch' ? "bg-natural-accent text-white" : "text-natural-text-muted hover:bg-natural-accent/5"
                )}
              >
                <Utensils className="w-3.5 h-3.5" />
                Almoço
              </button>
              <button 
                onClick={() => setSelectedPeriod('dinner')}
                className={cn(
                  "px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  selectedPeriod === 'dinner' ? "bg-natural-accent text-white" : "text-natural-text-muted hover:bg-natural-accent/5"
                )}
              >
                <Flame className="w-3.5 h-3.5" />
                Jantar
              </button>
            </div>
          </div>

          <div className="flex gap-3 w-full sm:w-auto overflow-x-auto whitespace-nowrap scrollbar-hide pb-2 sm:pb-0">
            <button 
              onClick={() => exportOrders(startDateFilter)}
              className="flex items-center gap-2 bg-natural-card border border-natural-border text-natural-text px-6 py-3 rounded-2xl font-bold hover:bg-natural-accent hover:text-white transition-all shadow-sm active:scale-95"
            >
              <FileText className="w-4 h-4" />
              PDF Cozinha
            </button>
            <button 
              onClick={toggleComboStatus}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-sm active:scale-95",
                (!currentMenu || !currentMenu.isComboEnabled)
                  ? "bg-natural-accent/10 text-natural-accent border border-natural-accent/20 hover:bg-natural-accent hover:text-white"
                  : "bg-natural-accent text-white border border-natural-accent"
              )}
            >
              <ChefHat className="w-4 h-4" />
              {(!currentMenu || !currentMenu.isComboEnabled) ? "Ativar Combo Pastel" : "Desativar Combo Pastel"}
            </button>
            <button 
              onClick={toggleMenuStatus}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-sm active:scale-95",
                (!currentMenu || currentMenu.status === 'closed')
                  ? "bg-green-50 text-green-700 border border-green-100 hover:bg-green-700 hover:text-white"
                  : "bg-red-50 text-red-700 border border-red-100 hover:bg-red-700 hover:text-white"
              )}
            >
              {(!currentMenu || currentMenu.status === 'closed') ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {(!currentMenu || currentMenu.status === 'closed') ? 'Liberar Almoço/Jantar' : 'Encerrar Pedidos'}
            </button>
            {!showClearConfirm ? (
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 bg-white border border-natural-border text-natural-text-muted px-6 py-3 rounded-2xl font-bold hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition-all shadow-sm active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                Limpar Período
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-red-50 border border-red-200 p-3 rounded-[24px] shadow-lg animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col px-2">
                  <p className="text-[10px] font-bold uppercase text-red-700 tracking-wider">Atenção!</p>
                  <p className="text-[11px] text-red-600 font-medium italic serif">Arquivar {filteredOrders.length} pedidos e resetar cardápio?</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={clearMenu}
                    className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 transition-all shadow-sm active:scale-95"
                  >
                    Confirmar
                  </button>
                  <button 
                    onClick={() => setShowClearConfirm(false)}
                    className="bg-white text-red-700 border border-red-200 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-red-50 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            <button 
              onClick={requestNotifPermission}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-sm active:scale-95",
                notifPermission === 'granted' 
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-natural-accent text-white hover:bg-natural-text"
              )}
              title={notifPermission === 'granted' ? "Notificações Ativas" : "Ativar Notificações"}
            >
              {notifPermission === 'granted' ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {notifPermission === 'granted' ? 'Alertas OK' : 'Ativar Alertas'}
            </button>
            
            {notifPermission === 'granted' && (
              <button 
                onClick={testNotifications}
                className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-100 px-6 py-3 rounded-2xl font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                title="Testar Som e Pop-up"
              >
                <Bell className="w-4 h-4 animate-bounce" />
                Testar Alerta
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-natural-bg rounded-2xl border border-natural-border w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button 
            onClick={() => setSubView('dashboard')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-tight transition-all",
              subView === 'dashboard' ? "bg-natural-accent text-white shadow-lg" : "text-natural-text-muted hover:text-natural-accent"
            )}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <button 
            onClick={() => setSubView('orders')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-tight transition-all",
              subView === 'orders' ? "bg-natural-accent text-white shadow-lg" : "text-natural-text-muted hover:text-natural-accent"
            )}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            Solicitações
          </button>
          <button 
            onClick={() => setSubView('menu')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-tight transition-all",
              subView === 'menu' ? "bg-natural-accent text-white shadow-lg" : "text-natural-text-muted hover:text-natural-accent"
            )}
          >
            <ChefHat className="w-3.5 h-3.5" />
            Cardápio
          </button>
          <button 
            onClick={() => setSubView('history')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-tight transition-all",
              subView === 'history' ? "bg-natural-accent text-white shadow-lg" : "text-natural-text-muted hover:text-natural-accent"
            )}
          >
            <History className="w-3.5 h-3.5" />
            Histórico
          </button>
          <button 
            onClick={() => setSubView('users')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-tight transition-all",
              subView === 'users' ? "bg-natural-accent text-white shadow-lg" : "text-natural-text-muted hover:text-natural-accent"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Usuários
          </button>
          <button 
            onClick={() => setSubView('help')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-tight transition-all",
              subView === 'help' ? "bg-natural-accent text-white shadow-lg" : "text-natural-text-muted hover:text-natural-accent"
            )}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Ajuda ADM
          </button>
        </div>
      </div>

      <div className="w-full">
        <AnimatePresence mode="wait">
          {subView === 'help' ? (
            <motion.div key="help" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
              <div className="bg-natural-card rounded-[32px] p-12 border border-natural-border shadow-sm">
                <div className="flex items-center gap-6 mb-10 pb-6 border-b border-natural-border">
                  <div className="p-4 bg-natural-accent/5 rounded-[24px] border border-natural-accent/10">
                    <AlertCircle className="w-8 h-8 text-natural-accent" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-serif italic text-natural-accent leading-none">Manual do Administrador</h3>
                    <p className="text-natural-text-muted text-sm mt-2 uppercase tracking-widest font-bold">Aprenda a gerir o Restaurante da Sol</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
                  <section className="space-y-4">
                    <h4 className="flex items-center gap-3 font-bold text-natural-text text-xl italic serif">
                      <ChefHat className="w-6 h-6 text-natural-accent" />
                      1. Cardápio
                    </h4>
                    <p className="text-sm text-natural-text-muted italic leading-relaxed">
                      A primeira etapa é cadastrar os itens do dia. No menu <strong>"Cardápio"</strong>, você pode adicionar proteínas, 
                      acompanhamentos e guarnições. Use o <strong>"Gerar Sugestões"</strong> para um setup rápido. 
                      Você pode arrastar os itens para reordenar a ordem que o cliente vê.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h4 className="flex items-center gap-3 font-bold text-natural-text text-xl italic serif">
                      <Unlock className="w-6 h-6 text-natural-accent" />
                      2. Abrir/Fechar
                    </h4>
                    <p className="text-sm text-natural-text-muted italic leading-relaxed">
                      No topo do painel, os botões <strong>"Liberar"</strong> e <strong>"Encerrar"</strong> controlam se o sistema aceita pedidos. 
                      Certifique-se de encerrar quando atingir o limite de produção do turno.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h4 className="flex items-center gap-3 font-bold text-natural-text text-xl italic serif">
                      <History className="w-6 h-6 text-natural-accent" />
                      3. Limpar Turno
                    </h4>
                    <p className="text-sm text-natural-text-muted italic leading-relaxed">
                      Ao final do Almoço, use o <strong>"Limpar Período"</strong>. Isso arquiva todos os pedidos realizados 
                      e limpa o cardápio, deixando o sistema pronto para o Jantar (ou para o dia seguinte).
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h4 className="flex items-center gap-3 font-bold text-natural-text text-xl italic serif">
                      <FileText className="w-6 h-6 text-natural-accent" />
                      4. Cozinha (PDF)
                    </h4>
                    <p className="text-sm text-natural-text-muted italic leading-relaxed">
                      O botão <strong>"PDF Cozinha"</strong> gera um documento pronto para impressão, com todos os pedidos 
                      agrupados por setor e os itens detalhados para a montagem.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h4 className="flex items-center gap-3 font-bold text-natural-text text-xl italic serif">
                      <Bell className="w-6 h-6 text-natural-accent" />
                      5. Alertas Sonoros
                    </h4>
                    <p className="text-sm text-natural-text-muted italic leading-relaxed">
                      Clique em <strong>"Ativar Alertas"</strong> para que o navegador toque um som sempre que um novo marmitex for solicitado.
                    </p>
                  </section>

                  <div className="bg-natural-accent/5 p-6 rounded-[24px] border border-natural-accent/10 flex flex-col justify-center">
                    <h5 className="font-bold text-natural-accent text-[11px] uppercase tracking-widest mb-2">Suporte Rápido</h5>
                    <p className="text-xs text-natural-text-muted italic leading-relaxed font-medium">
                      O sistema é otimizado para celulares e tablets. Você pode gerir os pedidos diretamente na cozinha!
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : subView === 'dashboard' ? (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <DashboardStats allOrders={allOrders} />
            </motion.div>
          ) : subView === 'menu' ? (
            /* Menu Editor */
            <motion.div key="menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <section className="space-y-8 bg-natural-card p-10 rounded-[40px] shadow-natural border border-natural-border/50 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="text-2xl font-serif text-natural-accent italic flex items-center gap-3">
                <span className="p-2 bg-natural-accent/5 rounded-lg border border-natural-accent/10"><ChefHat className="text-natural-accent" /></span>
                Configurar Cardápio - {selectedPeriod === 'lunch' ? 'Almoço' : 'Jantar'}
              </h3>
              
              <div className="flex items-center gap-3">
                <div className="flex bg-natural-bg p-1 rounded-xl border border-natural-border shadow-sm">
                  <button 
                    onClick={() => setIsLibraryView(false)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      !isLibraryView ? "bg-natural-accent text-white" : "text-natural-text-muted hover:bg-natural-accent/5"
                    )}
                  >
                    Ativos Hoje
                  </button>
                  <button 
                    onClick={() => setIsLibraryView(true)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      isLibraryView ? "bg-natural-accent text-white" : "text-natural-text-muted hover:bg-natural-accent/5"
                    )}
                  >
                    Acervo Geral
                  </button>
                </div>

                {isAdding ? (
                   <button onClick={() => setIsAdding(false)} className="text-natural-text-muted font-bold text-xs uppercase hover:text-red-800 tracking-widest">Cancelar</button>
                ) : (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="bg-natural-accent text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:shadow-lg transition-all"
                  >
                    + Novo Item
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence>
              {isAdding && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border border-natural-border rounded-[32px] p-6 bg-natural-bg space-y-5 shadow-inner"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-natural-accent"></div>
                    <p className="text-[10px] uppercase font-bold text-natural-text tracking-widest">Este item será adicionado ao Acervo Geral e ativado para hoje.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest text-natural-accent uppercase ml-1">NOME DO PRATO</label>
                      <input 
                        className="w-full bg-natural-card border border-natural-border focus:border-natural-accent-light outline-none rounded-2xl p-4 text-sm font-medium shadow-sm transition-all"
                        value={editingMenu.name}
                        onChange={e => setEditingMenu({...editingMenu, name: e.target.value})}
                        placeholder="Ex: Sobrecoxa Assada"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest text-natural-accent uppercase ml-1">CATEGORIA</label>
                      <select 
                        className="w-full bg-natural-card border border-natural-border focus:border-natural-accent-light outline-none rounded-2xl p-4 text-sm font-medium shadow-sm transition-all appearance-none text-natural-text"
                        value={editingMenu.category}
                        onChange={e => setEditingMenu({...editingMenu, category: e.target.value as any})}
                      >
                        <option value="protein">Proteína</option>
                        <option value="accompaniment">Acompanhamento</option>
                        <option value="potato">Batatas</option>
                        <option value="garnish">Guarnição</option>
                        <option value="extra">Opcional (Sim/Não)</option>
                        <option value="pastel">Pastel</option>
                        <option value="beverage">Bebida</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest text-natural-accent uppercase ml-1">DESCRIÇÃO CURTA</label>
                    <textarea 
                      className="w-full bg-natural-card border border-natural-border focus:border-natural-accent-light outline-none rounded-2xl p-4 text-sm font-medium shadow-sm transition-all"
                      value={editingMenu.description}
                      onChange={e => setEditingMenu({...editingMenu, description: e.target.value})}
                      placeholder="Ervas finas, Molho especial..."
                      rows={2}
                    />
                  </div>
                  <button 
                    onClick={handleAddMenuItem}
                    className="w-full bg-natural-accent text-white py-4 rounded-2xl font-bold shadow-xl shadow-natural/10 hover:bg-natural-accent-light active:scale-95 transition-all text-sm uppercase tracking-widest"
                  >
                    Confirmar e Salvar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {isLibraryView ? (
                <div className="bg-natural-bg border border-natural-border rounded-[32px] p-6 shadow-inner space-y-6">
                  {['protein', 'accompaniment', 'potato', 'garnish', 'extra', 'pastel', 'beverage'].map(cat => {
                    const itemsInCat = libraryItems.filter(i => i.category === cat);
                    if (itemsInCat.length === 0) return null;
                    return (
                      <div key={cat} className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-natural-accent-light mb-4 border-b border-natural-border/50 pb-2">
                          {cat === 'protein' ? 'Proteínas' : cat === 'accompaniment' ? 'Acompanhamentos' : cat === 'potato' ? 'Batatas' : cat === 'garnish' ? 'Guarnições & Saladas' : cat === 'pastel' ? 'Pastéis' : cat === 'beverage' ? 'Bebidas' : 'Opcionais'}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {itemsInCat.map(item => {
                            const isActive = currentMenu?.items.some(i => i.id === item.id) ?? false;
                            return (
                              <div key={item.id} className="group flex items-center justify-between p-3 sm:p-4 bg-natural-card border border-natural-border rounded-2xl shadow-sm hover:border-natural-accent-light transition-all gap-2 overflow-hidden">
                                <div className="flex-1 min-w-0 pr-2">
                                  <p className="font-bold text-sm text-natural-text truncate">{item.name}</p>
                                  {item.description && <p className="text-[10px] text-natural-text-muted mt-0.5 truncate">{item.description}</p>}
                                </div>
                                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                  <div className="flex items-center gap-0.5 sm:gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingLibraryItemId(item.id);
                                        setEditingMenu(item);
                                        setIsAdding(true);
                                      }}
                                      className="p-1.5 sm:p-2 text-natural-text-muted hover:text-natural-accent hover:bg-natural-accent/10 rounded-lg transition-colors"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLibraryItem(item.id)}
                                      className="p-1.5 sm:p-2 text-natural-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                  </div>
                                  <div className="w-px h-6 bg-natural-border mx-1"></div>
                                  <button
                                    onClick={() => toggleLibraryItem(item, !isActive)}
                                    className={cn(
                                      "w-10 sm:w-12 h-6 rounded-full transition-colors relative shrink-0",
                                      isActive ? "bg-natural-accent" : "bg-natural-border"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform",
                                      isActive ? "translate-x-5 sm:translate-x-7" : "translate-x-1"
                                    )}></div>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  
                  {libraryItems.length === 0 ? (
                    <div className="text-center py-10 opacity-70 border-t border-natural-border/30 mt-6 pt-10">
                      <ChefHat className="w-12 h-12 text-natural-border mx-auto mb-4" />
                      <p className="font-serif italic text-sm text-natural-text-muted mb-6">O Acervo Geral está vazio. Você pode criar novos itens ou carregar as sugestões.</p>
                      <button 
                        onClick={seedDailyMenu}
                        className="flex mx-auto items-center gap-2 bg-natural-accent/10 text-natural-accent px-6 py-3 rounded-2xl font-bold hover:bg-natural-accent hover:text-white transition-all text-xs uppercase tracking-widest border border-natural-accent/20"
                      >
                        <Plus className="w-4 h-4" />
                        Carregar Sugestões
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center border-t border-natural-border/30 pt-8 mt-4">
                      <button 
                        onClick={seedDailyMenu}
                        className="flex items-center gap-2 bg-natural-bg text-natural-text-muted px-4 py-2.5 rounded-xl font-bold hover:bg-natural-accent/10 hover:text-natural-accent transition-all text-[10px] uppercase tracking-widest border border-natural-border hover:border-natural-accent/20 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Recarregar Sugestões Padrão
                      </button>
                    </div>
                  )}
                </div>
              ) : currentMenu ? (
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={currentMenu.items.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {currentMenu.items.map(item => (
                        <SortableMenuItem 
                          key={item.id} 
                          item={item} 
                          onDelete={handleDeleteItem} 
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-center py-20 bg-natural-bg rounded-[32px] border border-dashed border-natural-border flex flex-col items-center gap-6">
                  <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="font-serif italic text-sm text-natural-text-muted">Aguardando definição do cardápio...</p>
                  <button 
                    onClick={seedDailyMenu}
                    className="flex items-center gap-2 bg-natural-accent/10 text-natural-accent px-6 py-3 rounded-2xl font-bold hover:bg-natural-accent hover:text-white transition-all text-xs uppercase tracking-widest border border-natural-accent/20"
                  >
                    <Plus className="w-4 h-4" />
                    Carregar Sugestões
                  </button>
                </div>
              )}
            </div>
          </section>
          </motion.div>
          ) : subView === 'users' ? (
            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <section className="space-y-8 max-w-5xl mx-auto">
             <div className="bg-natural-card p-8 rounded-[32px] border border-natural-border/50 shadow-sm">
                <h3 className="text-2xl font-serif text-natural-accent italic flex items-center gap-3 mb-8">
                  <span className="p-2 bg-natural-accent/5 rounded-lg border border-natural-accent/10">
                    <Users className="text-natural-accent" />
                  </span>
                  Gestão de Usuários e Permissões
                </h3>
                
                <UserManagement />
             </div>
          </section>
          </motion.div>
          ) : (
            /* Orders List (Solicitações & Histórico) */
            <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <section className="space-y-8 max-w-5xl mx-auto">
            <div className="flex flex-col gap-6 bg-natural-card p-8 rounded-[32px] border border-natural-border/50 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-2xl font-serif text-natural-accent italic flex items-center gap-3">
                  <span className="p-2 bg-natural-accent/5 rounded-lg border border-natural-accent/10">
                    {subView === 'history' ? <History className="text-natural-accent" /> : <ShoppingCart className="text-natural-accent" />}
                  </span>
                  {subView === 'history' ? 'Histórico de Pedidos' : 'Pedidos Recebidos'} ({filteredOrders.length})
                </h3>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {filteredOrders.length > 0 && (
                    <button 
                      onClick={exportFilteredReport}
                      className="text-[10px] font-bold uppercase text-white bg-natural-accent hover:bg-natural-accent-light transition-all tracking-widest px-4 py-2 rounded-full border border-natural-accent flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Exportar Relatório ({filteredOrders.length})
                    </button>
                  )}
                  {subView === 'history' && (
                    <button 
                      onClick={() => { setStartDateFilter(''); setEndDateFilter(''); setNameFilter(''); setSectorFilter('all'); }}
                      className="text-[10px] font-bold uppercase text-natural-accent hover:text-natural-text transition-colors tracking-widest bg-natural-bg/50 px-4 py-2 rounded-full border border-natural-border"
                    >
                      Limpar Filtros
                    </button>
                  )}
                  {subView === 'orders' && (
                    <div className="flex bg-natural-bg p-1 rounded-xl border border-natural-border shadow-sm overflow-hidden shrink-0">
                      <button 
                        onClick={() => setOrderViewMode('individual')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                          orderViewMode === 'individual' ? "bg-natural-accent text-white" : "text-natural-text-muted hover:bg-natural-accent/5"
                        )}
                      >
                        Individual
                      </button>
                      <button 
                        onClick={() => setOrderViewMode('assembly')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                          orderViewMode === 'assembly' ? "bg-natural-accent text-white" : "text-natural-text-muted hover:bg-natural-accent/5"
                        )}
                      >
                        Montagem
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 border-t border-natural-border/30 pt-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-natural-text-muted tracking-widest ml-1">Buscar por Nome</label>
                  <input 
                    type="text"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    placeholder="Nome do colaborador..."
                    className="w-full bg-natural-bg border border-natural-border rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-natural-accent-light transition-all text-natural-text"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-natural-text-muted tracking-widest ml-1">Filtrar por Status</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-natural-bg border border-natural-border rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-natural-accent-light transition-all appearance-none cursor-pointer text-natural-text"
                  >
                    <option value="active">Ativos (Novos)</option>
                    <option value="archived">Arquivados (Histórico)</option>
                    <option value="all">Todos os Pedidos</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-natural-text-muted tracking-widest ml-1">Data Inicial (De)</label>
                  <input 
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="w-full bg-natural-bg border border-natural-border rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-natural-accent-light transition-all text-natural-text appearance-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-natural-text-muted tracking-widest ml-1">Data Final (Até)</label>
                  <input 
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="w-full bg-natural-bg border border-natural-border rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-natural-accent-light transition-all text-natural-text appearance-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-natural-text-muted tracking-widest ml-1">Filtrar por Setor</label>
                  <select 
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    className="w-full bg-natural-bg border border-natural-border rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-natural-accent-light transition-all appearance-none cursor-pointer text-natural-text"
                  >
                    <option value="all">Todos os Setores</option>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {subView === 'orders' && filteredOrders.length > 0 && (
              <div className="bg-natural-bg/50 border border-natural-border/50 rounded-[32px] p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-natural-accent text-white rounded-lg">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-lg font-serif italic text-natural-accent">Resumo de Preparo (Quantidades Totais)</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {['protein', 'accompaniment', 'potato', 'garnish', 'extra', 'pastel', 'beverage'].map(cat => {
                    const catItems = Object.entries(itemQuantities)
                      .filter(([name]) => itemToCategory[name.trim().toLowerCase()] === cat)
                      .sort((a, b) => b[1] - a[1]);
                    
                    if (catItems.length === 0) return null;

                    return (
                      <div key={cat} className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-[2px] text-natural-text-muted border-b border-natural-border pb-2">
                          {categoryLabels[cat]}
                        </p>
                        <div className="space-y-2">
                          {catItems.map(([name, count]) => (
                            <div key={name} className="flex items-center justify-between gap-2 bg-white p-3 rounded-xl border border-natural-border shadow-sm">
                              <span className="text-xs font-bold text-natural-text truncate max-w-[120px]" title={name}>{name}</span>
                              <span className="bg-natural-accent text-white text-[10px] font-bold px-2 py-1 rounded-lg shrink-0">{count}x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Outros / Não Categorizados */}
                  {(() => {
                    const printedItems = new Set<string>();
                    ['protein', 'accompaniment', 'potato', 'garnish', 'extra', 'pastel', 'beverage'].forEach(cat => {
                      Object.entries(itemQuantities).forEach(([name]) => {
                        if (itemToCategory[name.trim().toLowerCase()] === cat) printedItems.add(name);
                      });
                    });

                    const otherItems = Object.entries(itemQuantities)
                      .filter(([name]) => !printedItems.has(name))
                      .sort((a, b) => b[1] - a[1]);

                    if (otherItems.length === 0) return null;

                    return (
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-[2px] text-natural-text-muted border-b border-natural-border pb-2">
                          Outros
                        </p>
                        <div className="space-y-2">
                          {otherItems.map(([name, count]) => (
                            <div key={name} className="flex items-center justify-between gap-2 bg-white p-3 rounded-xl border border-natural-border shadow-sm">
                              <span className="text-xs font-bold text-natural-text truncate max-w-[120px]" title={name}>{name}</span>
                              <span className="bg-natural-accent text-white text-[10px] font-bold px-2 py-1 rounded-lg shrink-0">{count}x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {filteredOrders.length > 0 ? (
                orderViewMode === 'assembly' && subView === 'orders' ? (
                  assemblyGroups.map(([signature, group]) => (
                    <div key={signature} className="bg-natural-card p-8 rounded-[32px] border border-natural-border/50 shadow-sm hover:shadow-md transition-all space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="text-4xl font-serif italic text-natural-accent mb-2">{group.count}x</h4>
                          <p className="text-xs uppercase tracking-widest font-bold text-natural-text-muted">Marmitas idênticas</p>
                        </div>
                        <div className="p-3 bg-natural-accent/10 rounded-2xl border border-natural-accent/10">
                          <ChefHat className="w-6 h-6 text-natural-accent" />
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-2">
                        {group.items.map(it => (
                          <span key={it} className="bg-natural-accent/5 border border-natural-accent/20 text-natural-accent px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-tight">{it}</span>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-natural-border/30">
                        <p className="text-[10px] font-bold uppercase text-natural-text-muted tracking-widest mb-3 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5" />
                          Destinatários:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.orders.map((o, idx) => (
                            <div key={idx} className="flex flex-col bg-natural-bg border border-natural-border p-3 rounded-xl min-w-[120px] relative group">
                              {o.id && (
                                <button 
                                  onClick={() => onDeleteOrder(o.id!)}
                                  className="absolute top-2 right-2 p-1 text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                                  title="Excluir pedido"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                              <span className="text-xs font-bold text-natural-text italic serif pr-4">{o.userName}</span>
                              <span className="text-[9px] uppercase tracking-widest text-natural-text-muted">{o.sector}</span>
                              {o.period === 'dinner' && (
                                <span className={cn(
                                  "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 mt-1 rounded text-center self-start",
                                  o.deliveryType === 'entrega' 
                                    ? "bg-amber-100 text-amber-800 border border-amber-200" 
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                )}>
                                  {o.deliveryType === 'entrega' ? '🚚 Entrega' : '🥡 Retirada'}
                                </span>
                              )}
                              
                              <div className="flex flex-wrap gap-1 mt-2">
                                {o.items
                                  .filter(name => {
                                    const lowerName = name.trim().toLowerCase();
                                    const cat = itemToCategory[lowerName];
                                    if (lowerName === 'farofa') return false;
                                    // Robust check: if no category, keep it here so it's not lost
                                    if (!cat) return true;
                                    return cat === 'protein' || cat === 'garnish' || cat === 'extra' || cat === 'pastel' || cat === 'beverage';
                                  })
                                  .map(it => (
                                    <span key={it} className="text-[8px] bg-natural-accent/10 text-natural-accent px-1.5 py-0.5 rounded-md font-bold uppercase">{it}</span>
                                  ))
                                }
                              </div>

                              {o.observation && <span className="text-[10px] text-red-600 mt-2 font-bold leading-tight">*{o.observation}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  filteredOrders
                    .sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
                    .map(order => (
                    <div key={order.id} className="bg-natural-card p-8 rounded-[32px] border border-natural-border/50 shadow-sm hover:shadow-md transition-all space-y-4 border-l-4 border-l-natural-accent">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="text-[10px] font-bold uppercase text-natural-accent bg-natural-bg border border-natural-border px-3 py-1.5 rounded-full inline-block tracking-widest">Setor {order.sector}</span>
                            {order.period === 'dinner' && (
                              <span className={cn(
                                "text-[10px] font-bold uppercase px-3 py-1.5 rounded-full inline-block tracking-widest border",
                                order.deliveryType === 'entrega' 
                                  ? "bg-amber-100 text-amber-800 border-amber-200" 
                                  : "bg-emerald-100 text-emerald-800 border-emerald-200"
                              )}>
                                {order.deliveryType === 'entrega' ? '🚚 Entrega' : '🥡 Retirada'}
                              </span>
                            )}
                            <span className="text-sm font-bold text-natural-accent font-serif italic">{order.userName || 'Sem nome'}</span>
                          </div>
                          <p className="text-sm text-natural-text font-medium italic serif">Pedido {order.date === format(new Date(), 'yyyy-MM-dd') ? 'às' : `em ${format(new Date(order.date + 'T12:00:00'), 'dd/MM')} às`} {order.timestamp ? format(order.timestamp.toDate(), 'HH:mm') : '--:--'}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase text-natural-text-muted">
                          {order.period === 'lunch' ? 'Almoço' : 'Jantar'}
                        </span>
                      </div>
                      
                      {order.id && (
                        <div className="flex justify-end gap-2 -mt-2">
                          <button 
                            onClick={() => onDeleteOrder(order.id!)}
                            className="p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-full transition-all"
                            title="Excluir pedido definitivamente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {order.items
                          .filter(it => it.toLowerCase() !== 'farofa')
                          .map(it => (
                            <span key={it} className="bg-natural-bg border border-natural-border text-natural-text-muted px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-tight">{it}</span>
                          ))
                        }
                      </div>
                      {order.observation && (
                        <div className="pt-3 border-t border-natural-border/30">
                          <p className="text-[10px] font-bold uppercase text-natural-accent tracking-widest mb-1">Observação:</p>
                          <p className="text-xs text-natural-text-muted italic bg-natural-bg/50 p-3 rounded-xl border border-natural-border/30">
                            {order.observation}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : (
                <div className="md:col-span-2 bg-natural-card rounded-[40px] p-24 text-center border border-natural-border shadow-inner">
                  {subView === 'history' ? <History className="w-12 h-12 text-natural-border/40 mx-auto mb-6" /> : <ListOrdered className="w-12 h-12 text-natural-border/40 mx-auto mb-6" />}
                  <p className="text-natural-text-muted font-serif italic uppercase text-xs tracking-widest">
                    {subView === 'history' ? 'Nenhum registro encontrado no histórico' : 'Nenhum pedido ativo encontrado'}
                  </p>
                </div>
              )}
            </div>
          </section>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}

