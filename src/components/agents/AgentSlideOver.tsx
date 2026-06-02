'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SafeUser, CreateAgentRequest, UpdateAgentRequest } from '@/types';

interface AgentSlideOverProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAgentRequest | UpdateAgentRequest) => Promise<{ success: boolean; message?: string }>;
  editAgent?: SafeUser | null;
  checkEmail: (email: string) => Promise<boolean>;
}

interface FormErrors {
  name?: string;
  email?: string;
  mobileNumber?: string;
  password?: string;
  confirmPassword?: string;
}

export function AgentSlideOver({
  open,
  onClose,
  onSubmit,
  editAgent,
  checkEmail,
}: AgentSlideOverProps) {
  const isEdit = !!editAgent;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (editAgent) {
      setName(editAgent.name);
      setEmail(editAgent.email);
      setMobileNumber(editAgent.mobileNumber);
    } else {
      setName('');
      setEmail('');
      setMobileNumber('');
    }
    setPassword('');
    setConfirmPassword('');
    setErrors({});
    setServerError('');
  }, [editAgent, open]);

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        if (value.trim().length > 50) return 'Name must be at most 50 characters';
        if (!/^[a-zA-Z\s]+$/.test(value.trim())) return 'Name can only contain letters and spaces';
        return undefined;
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim()))
          return 'Invalid email format';
        return undefined;
      case 'mobileNumber':
        if (!value.trim()) return 'Mobile number is required';
        if (!/^\+[1-9]\d{6,14}$/.test(value.trim()))
          return 'Must be in E.164 format (e.g., +919876543210)';
        return undefined;
      case 'password':
        if (!isEdit) {
          if (!value) return 'Password is required';
          if (value.length < 8) return 'Must be at least 8 characters';
          if (!/[A-Z]/.test(value)) return 'Must contain an uppercase letter';
          if (!/[0-9]/.test(value)) return 'Must contain a number';
          if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value))
            return 'Must contain a special character';
        }
        return undefined;
      case 'confirmPassword':
        if (!isEdit && value !== password) return 'Passwords do not match';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleEmailBlur = async () => {
    const emailError = validateField('email', email);
    if (emailError) {
      setErrors((prev) => ({ ...prev, email: emailError }));
      return;
    }
    if (isEdit && email === editAgent?.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
      return;
    }

    setEmailChecking(true);
    const available = await checkEmail(email);
    setEmailChecking(false);

    if (!available) {
      setErrors((prev) => ({ ...prev, email: 'This email is already taken' }));
    } else {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    // Validate all fields
    const newErrors: FormErrors = {
      name: validateField('name', name),
      email: validateField('email', email),
      mobileNumber: validateField('mobileNumber', mobileNumber),
      password: validateField('password', password),
      confirmPassword: validateField('confirmPassword', confirmPassword),
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      let result;
      if (isEdit) {
        const updateData: UpdateAgentRequest = {};
        if (name !== editAgent.name) updateData.name = name;
        if (email !== editAgent.email) updateData.email = email;
        if (mobileNumber !== editAgent.mobileNumber)
          updateData.mobileNumber = mobileNumber;

        if (Object.keys(updateData).length === 0) {
          onClose();
          return;
        }
        result = await onSubmit(updateData);
      } else {
        result = await onSubmit({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          mobileNumber: mobileNumber.trim(),
        });
      }

      if (result.success) {
        onClose();
      } else {
        setServerError(result.message || 'An error occurred');
      }
    } catch {
      setServerError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Get country flag from mobile number
  const getCountryFlag = (num: string): string => {
    if (num.startsWith('+91')) return '🇮🇳';
    if (num.startsWith('+1')) return '🇺🇸';
    if (num.startsWith('+44')) return '🇬🇧';
    if (num.startsWith('+61')) return '🇦🇺';
    if (num.startsWith('+86')) return '🇨🇳';
    if (num.startsWith('+81')) return '🇯🇵';
    if (num.startsWith('+')) return '🌍';
    return '';
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {isEdit ? 'Edit Agent' : 'Add New Agent'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {isEdit
                      ? 'Update agent information'
                      : 'Fill in the details to create a new agent'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                <div className="space-y-5">
                  {serverError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                      {serverError}
                    </div>
                  )}

                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="agent-name">Full Name</Label>
                    <Input
                      id="agent-name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name)
                          setErrors((p) => ({
                            ...p,
                            name: validateField('name', e.target.value),
                          }));
                      }}
                      onBlur={() =>
                        setErrors((p) => ({
                          ...p,
                          name: validateField('name', name),
                        }))
                      }
                      placeholder="John Doe"
                      className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-xs text-red-600">{errors.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="agent-email">Email Address</Label>
                    <div className="relative">
                      <Input
                        id="agent-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email)
                            setErrors((p) => ({
                              ...p,
                              email: validateField('email', e.target.value),
                            }));
                        }}
                        onBlur={handleEmailBlur}
                        placeholder="agent@company.com"
                        className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {emailChecking && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                        </div>
                      )}
                    </div>
                    {errors.email && (
                      <p className="text-xs text-red-600">{errors.email}</p>
                    )}
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-2">
                    <Label htmlFor="agent-mobile">Mobile Number</Label>
                    <div className="relative">
                      {mobileNumber && getCountryFlag(mobileNumber) && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">
                          {getCountryFlag(mobileNumber)}
                        </span>
                      )}
                      <Input
                        id="agent-mobile"
                        value={mobileNumber}
                        onChange={(e) => {
                          setMobileNumber(e.target.value);
                          if (errors.mobileNumber)
                            setErrors((p) => ({
                              ...p,
                              mobileNumber: validateField(
                                'mobileNumber',
                                e.target.value
                              ),
                            }));
                        }}
                        onBlur={() =>
                          setErrors((p) => ({
                            ...p,
                            mobileNumber: validateField(
                              'mobileNumber',
                              mobileNumber
                            ),
                          }))
                        }
                        placeholder="+919876543210"
                        className={`${
                          mobileNumber && getCountryFlag(mobileNumber)
                            ? 'pl-10'
                            : ''
                        } ${
                          errors.mobileNumber
                            ? 'border-red-500 focus-visible:ring-red-500'
                            : ''
                        }`}
                      />
                    </div>
                    {errors.mobileNumber && (
                      <p className="text-xs text-red-600">
                        {errors.mobileNumber}
                      </p>
                    )}
                  </div>

                  {/* Password (create only) */}
                  {!isEdit && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="agent-password">Password</Label>
                        <Input
                          id="agent-password"
                          type="password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password)
                              setErrors((p) => ({
                                ...p,
                                password: validateField(
                                  'password',
                                  e.target.value
                                ),
                              }));
                          }}
                          onBlur={() =>
                            setErrors((p) => ({
                              ...p,
                              password: validateField('password', password),
                            }))
                          }
                          placeholder="Min 8 chars, uppercase + number + special"
                          className={
                            errors.password
                              ? 'border-red-500 focus-visible:ring-red-500'
                              : ''
                          }
                        />
                        {errors.password && (
                          <p className="text-xs text-red-600">
                            {errors.password}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="agent-confirm-password">
                          Confirm Password
                        </Label>
                        <Input
                          id="agent-confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (errors.confirmPassword)
                              setErrors((p) => ({
                                ...p,
                                confirmPassword: validateField(
                                  'confirmPassword',
                                  e.target.value
                                ),
                              }));
                          }}
                          onBlur={() =>
                            setErrors((p) => ({
                              ...p,
                              confirmPassword: validateField(
                                'confirmPassword',
                                confirmPassword
                              ),
                            }))
                          }
                          placeholder="Re-enter password"
                          className={
                            errors.confirmPassword
                              ? 'border-red-500 focus-visible:ring-red-500'
                              : ''
                          }
                        />
                        {errors.confirmPassword && (
                          <p className="text-xs text-red-600">
                            {errors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {isEdit && (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
                      💡 Password changes are handled through a separate &ldquo;Reset
                      Password&rdquo; flow (coming soon).
                    </div>
                  )}
                </div>
              </form>

              {/* Footer */}
              <div className="border-t border-slate-200 px-6 py-4 flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting
                    ? 'Saving...'
                    : isEdit
                    ? 'Update Agent'
                    : 'Create Agent'}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
