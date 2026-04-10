import React, { useState, useEffect } from 'react';
import { Mail, Lock, ShieldCheck, ArrowRight, X, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction
} from "@/components/ui/card";

const CASH_OPTIONS = [
  { value: 10000,   label: '1 万',  desc: '稍有挑战' },
  { value: 100000,  label: '10 万', desc: '入门推荐' },
  { value: 500000,  label: '50 万', desc: '进阶' },
  { value: 1000000, label: '100 万', desc: '挑战' },
];

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialCash, setInitialCash] = useState(100000);


  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const validateForm = () => {
    if (!email) return "请输入邮箱";
    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "请输入有效的邮箱地址";
    if (mode === 'login') {
      if (!password) return "请输入密码";
    } else {
      if (password.length < 8) return "密码长度至少需要 8 位";
    }
    return null;
  };

  const handleSendCode = () => {
    if (!email) return setError("请先输入邮箱/手机号以发送验证码");
    setCountdown(60);
    setError("提示：验证码已模拟发送 888888 (演示模式)");
    setTimeout(() => setError(''), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const url = mode === 'login' ? '/api/login' : '/api/register';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember_me: true, name: email.split('@')[0], initial_cash: initialCash })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '认证失败，请检查凭证');
        setLoading(false);
        return;
      }
      if (mode === 'login') {
        if (!data.user) {
          throw new Error('Server response missing user data');
        }
        onSuccess(data);
        onClose();
      } else {
        // 注册成功后自动登录
        const loginRes = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, remember_me: true }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok && loginData.user) {
          onSuccess(loginData);
          onClose();
        } else {
          setError('注册成功！请登录');
          setTimeout(() => { setMode('login'); setError(''); }, 1500);
        }
      }
    } catch (err) {
      console.error('[AuthModal] submit error:', err);
      setError(`Network error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="sm:max-w-sm p-0 border-none bg-transparent shadow-none" 
        aria-describedby="dialog-description"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Authentication</DialogTitle>
        <DialogDescription id="dialog-description" className="sr-only">
          Login or register to access the platform.
        </DialogDescription>
        
        <Card className="w-full max-w-sm mx-auto border border-white/10 bg-[#0a0a0b] shadow-2xl pb-2">
          <CardHeader className="p-6 pb-4 flex flex-col gap-1.5">
            <CardTitle>{mode === 'login' ? '登录您的账户' : '创建新账户'}</CardTitle>
            <CardDescription>
              {mode === 'login'
                ? '在下方输入您的邮箱或手机号以进行登录'
                : '在下方输入您的邮箱或手机号以注册账号'}
            </CardDescription>
            <CardAction>
              <Button 
                variant="link" 
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="px-0"
              >
                {mode === 'login' ? '立即注册' : '返回登录'}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">邮箱 / 手机号</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {mode === 'login' && (
                  <div className="grid gap-2">
                    <Label htmlFor="password">密码</Label>
                    <Input 
                      id="password" 
                      type="password"
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                )}
                {mode === 'register' && (
                  <div className="grid gap-2">
                    <Label htmlFor="reg-password">密码</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="至少 8 位"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-white/30">密码至少 8 位，注册后即可开始模拟交易</p>
                  </div>
                )}

                {error && (
                  <div className={`p-3 rounded-md border text-sm text-center ${
                    error.includes('成功') 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                      : 'bg-destructive/10 border-destructive/20 text-destructive'
                  }`}>
                    {error}
                  </div>
                )}
              </div>
            </form>
          </CardContent>
          <CardFooter className="px-6 pb-2 flex-col gap-2">
            <Button type="submit" disabled={loading} className="w-full" onClick={handleSubmit}>
              {loading ? '处理中...' : (mode === 'login' ? '立即登录' : '立即注册')}
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
