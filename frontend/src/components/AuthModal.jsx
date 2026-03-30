import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, ShieldCheck, X, ArrowRight, Smartphone } from 'lucide-react';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const handleSendCode = () => {
    if (!email) return alert("请输入邮箱/手机号");
    setCountdown(60);
    // Simulation: In production, call /api/auth/send-code
    alert("验证码已模拟发送：888888 (仅作演示)");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulation: Always succeed for now
    onAuthSuccess({ email, name: email.split('@')[0] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in group">
      {/* Backdrop with Dimming/Blur */}
      <div 
        className="absolute inset-0 bg-bg-deep/40 backdrop-blur-3xl transition-all duration-700"
        onClick={onClose}
      ></div>
      
      {/* Modal Card */}
      <div className="w-full max-w-md bg-bg-main/95 shadow-[0_32px_128px_rgba(0,0,0,0.95)] relative z-10 overflow-hidden rounded-[2.5rem] animate-fade-in border border-white/10">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        
        <button onClick={onClose} className="absolute top-8 right-8 text-text-dim hover:text-white transition-colors bg-white/5 p-2.5 rounded-full">
          <X size={20} />
        </button>

        <div className="p-14">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black font-brand tracking-tighter mb-3 text-white">
              {mode === 'login' ? '系统登录' : '开启专业量化'}
            </h2>
            <p className="text-text-dim text-xs uppercase tracking-[0.3em] font-black italic">
              YoungQuant Pro <span className="text-white/40">Terminal</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="relative group/input">
              <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-dim group-focus-within/input:text-white transition-colors" />
              <input 
                type="text" 
                placeholder="邮箱 / 手机号"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-black/40 border-2 border-white/10 rounded-2xl px-14 py-5 text-base outline-none focus:border-white/30 transition-all font-bold text-white shadow-inner"
                required
              />
            </div>

            <div className="relative group/input">
              <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-dim group-focus-within/input:text-white transition-colors" />
              <input 
                type="password" 
                placeholder="安全密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border-2 border-white/10 rounded-2xl px-14 py-5 text-base outline-none focus:border-white/30 transition-all font-bold text-white shadow-inner"
                required
              />
            </div>

            {mode === 'register' && (
              <div className="flex gap-4">
                <div className="relative flex-1 group/input">
                  <ShieldCheck size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-dim group-focus-within/input:text-white transition-colors" />
                  <input 
                    type="text" 
                    placeholder="验证码"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full bg-black/40 border-2 border-white/10 rounded-2xl px-14 py-5 text-sm outline-none focus:border-white/30 transition-all font-bold text-white shadow-inner"
                  />
                </div>
                <button 
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  className={`px-8 rounded-2xl text-xs font-black border-2 transition-all ${countdown > 0 ? 'text-text-dim cursor-not-allowed bg-white/2 border-white/5' : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/40'}`}
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
            )}

            <button 
              type="submit"
              className="mt-8 bg-white text-black py-5 rounded-2xl font-black text-base uppercase tracking-[0.3em] hover:brightness-90 active:scale-95 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-white/5"
            >
              {mode === 'login' ? '立即登录终端' : '完成注册'} <ArrowRight size={22} />
            </button>
          </form>

          <div className="mt-14 text-center pt-10 border-t border-white/10">
            <p className="text-sm font-bold text-text-muted">
              {mode === 'login' ? '还没有专业账号？' : '已有账号？'}
              <button 
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-white font-black ml-3 hover:underline underline-offset-4"
              >
                {mode === 'login' ? '点击注册' : '返回登录'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
