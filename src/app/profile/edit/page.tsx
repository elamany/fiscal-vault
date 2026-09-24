'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { 
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, 
  User, Mail, Lock, Eye, EyeOff, Save, Shield, Check, X as XIcon
} from 'lucide-react';
import { getPasswordRuleStatus, isPasswordValid, PASSWORD_RULES } from '@/lib/password-validation';

interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
}

function ProfileForm({ user }: { user: UserProfileData }) {
  const { refreshUser } = useAuth();

  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [email, setEmail] = useState(user.email || '');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const passwordRuleStatus = getPasswordRuleStatus(newPassword);
  const allRulesPass = isPasswordValid(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  // OTP Modal State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [pendingProfileData, setPendingProfileData] = useState<{ firstName: string; lastName: string; newEmail: string } | null>(null);

  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    if (email !== user.email) {
      // Email changed! Trigger OTP flow
      try {
        const res = await fetch('/api/auth/request-email-change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ newEmail: email }),
        });
        const data = await res.json();
        
        if (!res.ok) {
          setProfileError(data.error || 'Failed to request email change');
        } else {
          setPendingProfileData({ firstName, lastName, newEmail: email });
          setOtpModalOpen(true);
          setOtp('');
          setOtpError('');
        }
      } catch (error) {
        setProfileError('Network error. Please try again.');
      } finally {
        setProfileLoading(false);
      }
    } else {
      // No email change, just update name via standard PATCH
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ firstName, lastName, email }),
        });
        const data = await res.json();
        
        if (!res.ok) {
          setProfileError(data.error || 'Failed to update profile');
        } else {
          await refreshUser();
          setProfileSuccess('Profile updated successfully!');
          setTimeout(() => setProfileSuccess(''), 5000);
        }
      } catch (error) {
        setProfileError('Network error. Please try again.');
      } finally {
        setProfileLoading(false);
      }
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingProfileData) return;
    
    setOtpError('');
    setOtpLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          newEmail: pendingProfileData.newEmail,
          otp,
          firstName: pendingProfileData.firstName,
          lastName: pendingProfileData.lastName,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || 'Invalid OTP');
      } else {
        setOtpModalOpen(false);
        setOtp('');
        setPendingProfileData(null);
        await refreshUser();
        setProfileSuccess('Email and profile updated successfully!');
        setTimeout(() => setProfileSuccess(''), 5000);
      }
    } catch (error) {
      setOtpError('Network error. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingProfileData) return;
    setOtpError('');
    setOtpLoading(true);
    
    try {
      const res = await fetch('/api/auth/request-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newEmail: pendingProfileData.newEmail }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        // ✅ Handle 429 Cooldown specifically
        if (res.status === 429 && data.remainingSeconds) {
          setResendCooldown(data.remainingSeconds);
          setOtpError(''); // Clear error, the countdown UI will take over
        } else {
          setOtpError(data.error || 'Failed to resend code');
        }
      } else {
        setOtpError('');
        // Optional: You could add a small success toast here like "New code sent!"
      }
    } catch (error) {
      setOtpError('Network error. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || 'Failed to change password');
      } else {
        setPasswordSuccess(data.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(''), 5000);
      }
    } catch (error) {
      setPasswordError('Network error. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="mt-2 text-gray-600">Update your personal information and account security.</p>
        </div>

        <div className="space-y-6">
          {/* Profile Information Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                <p className="text-sm text-gray-500">Update your name and email address</p>
              </div>
            </div>

            {profileError && (
              <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-900">{profileError}</p>
              </div>
            )}

            {profileSuccess && (
              <div className="mb-4 flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-green-900">{profileSuccess}</p>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
                  <input id="firstName" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 focus:bg-white" />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-1.5">Last Name <span className="text-red-500">*</span></label>
                  <input id="lastName" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 focus:bg-white" />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 focus:bg-white" />
                </div>
                {email !== user.email && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800"><strong>Warning:</strong> Changing your email requires verifying the new address via a 6-digit code before it can be saved.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={profileLoading} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]">
                  {profileLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card (Unchanged from previous version) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Lock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                <p className="text-sm text-gray-500">Update your password to keep your account secure</p>
              </div>
            </div>

            {passwordError && (
              <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-900">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-green-900">{passwordSuccess}</p>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              {/* Current Password */}
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-gray-50/50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password with Live Rule Checklist */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 pr-10 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all bg-gray-50/50 focus:bg-white ${
                      newPassword.length === 0
                        ? 'border-gray-200 focus:ring-purple-500/20 focus:border-purple-500'
                        : allRulesPass
                        ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                        : 'border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* ✅ Live Rule Checklist */}
                {newPassword.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {PASSWORD_RULES.map((rule) => {
                      const passed = passwordRuleStatus[rule.id];
                      return (
                        <li
                          key={rule.id}
                          className={`flex items-center gap-2 text-xs transition-colors ${
                            passed ? 'text-green-700' : 'text-gray-500'
                          }`}
                        >
                          {passed ? (
                            <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          ) : (
                            <XIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          )}
                          <span className={passed ? 'font-medium' : ''}>{rule.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Confirm Password with Match Indicator */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all bg-gray-50/50 ${
                    confirmPassword.length === 0
                      ? 'border-gray-200 focus:ring-purple-500/20 focus:border-purple-500'
                      : passwordsMatch
                      ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                      : 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                  }`}
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <XIcon className="h-3 w-3" /> Passwords do not match
                  </p>
                )}
                {passwordsMatch && (
                  <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Passwords match
                  </p>
                )}
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  For security, changing your password will log you out of all other devices.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={
                    passwordLoading ||
                    !currentPassword ||
                    !allRulesPass ||
                    !passwordsMatch
                  }
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-600/20 active:scale-[0.98]"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {otpModalOpen && pendingProfileData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button 
              onClick={() => { 
                setOtpModalOpen(false); 
                setPendingProfileData(null); 
                setProfileError(''); 
                setResendCooldown(0); // Reset cooldown when closing
              }} 
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {/* Assuming you have X imported from lucide-react */}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            <div className="text-center mb-6">
              <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Verify New Email</h3>
              <p className="text-sm text-gray-600 mt-2">
                We sent a 6-digit verification code to <strong className="text-gray-900">{pendingProfileData.newEmail}</strong>. Enter it below to confirm the change.
              </p>
            </div>

            {otpError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <p className="text-sm font-medium text-red-900">{otpError}</p>
              </div>
            )}

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-1.5">6-Digit Code</label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              >
                {otpLoading ? (
                  <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Verifying...</>
                ) : 'Verify & Save Changes'}
              </button>

              <div className="text-center pt-2">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-gray-500">
                    Resend code in <span className="font-semibold text-gray-900">{resendCooldown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpLoading}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Didn&apos;t receive the code? Resend
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfileEditPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return <ProfileForm user={user} />;
}