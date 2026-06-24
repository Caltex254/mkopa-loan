'use client';

/* KYC Verification Component */
import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/components/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  User,
  CreditCard,
  Calendar,
  MapPin,
  Camera,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  ChevronLeft,
  ImageIcon,
} from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export default function KYC() {
  const { setView, user } = useAppStore();

  const [legalName, setLegalName] = useState(user?.fullName || '');
  const [nationalId, setNationalId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [idFrontImage, setIdFrontImage] = useState<string>('');
  const [idBackImage, setIdBackImage] = useState<string>('');
  const [idFrontName, setIdFrontName] = useState<string>('');
  const [idBackName, setIdBackName] = useState<string>('');
  const [isDraggingFront, setIsDraggingFront] = useState(false);
  const [isDraggingBack, setIsDraggingBack] = useState(false);

  const [kycStatus, setKycStatus] = useState<string | null>(user?.kycStatus || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = useCallback(async (
    file: File,
    side: 'front' | 'back'
  ) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    try {
      const base64 = await convertToBase64(file);
      if (side === 'front') {
        setIdFrontImage(base64);
        setIdFrontName(file.name);
      } else {
        setIdBackImage(base64);
        setIdBackName(file.name);
      }
      setError('');
    } catch {
      setError('Failed to process image. Please try again.');
    }
  }, []);

  const handleDrop = useCallback(async (
    e: React.DragEvent,
    side: 'front' | 'back'
  ) => {
    e.preventDefault();
    if (side === 'front') setIsDraggingFront(false);
    else setIsDraggingBack(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file, side);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent, side: 'front' | 'back') => {
    e.preventDefault();
    if (side === 'front') setIsDraggingFront(true);
    else setIsDraggingBack(true);
  }, []);

  const handleDragLeave = useCallback((side: 'front' | 'back') => {
    if (side === 'front') setIsDraggingFront(false);
    else setIsDraggingBack(false);
  }, []);

  const handleSubmit = async () => {
    if (!legalName || !nationalId || !dateOfBirth || !residentialAddress || !idFrontImage || !idBackImage) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalName,
          nationalId,
          dateOfBirth,
          residentialAddress,
          idFrontImage,
          idBackImage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit KYC');
        return;
      }

      setKycStatus('pending');
      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    pending: {
      icon: <Clock className="size-5" />,
      label: 'Pending Review',
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
    },
    verified: {
      icon: <CheckCircle2 className="size-5" />,
      label: 'Verified',
      color: 'text-green-700',
      bg: 'bg-green-50 border-green-200',
    },
    rejected: {
      icon: <XCircle className="size-5" />,
      label: 'Rejected',
      color: 'text-red-700',
      bg: 'bg-red-50 border-red-200',
    },
  };

  if (success && kycStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="size-8 text-[#00A651]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">KYC Submitted Successfully!</h2>
            <p className="text-gray-600 text-sm">
              Your identity verification is being reviewed. This usually takes 24 hours.
            </p>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              <Clock className="size-3 mr-1" />
              Status: Pending Review
            </Badge>
            <div className="pt-2">
              <Button
                onClick={() => setView('loan-apply')}
                className="w-full bg-[#00A651] hover:bg-[#008f45] text-white"
              >
                Continue to Loan Application
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (kycStatus === 'verified') {
    const cfg = statusConfig.verified;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className={`mx-auto w-16 h-16 rounded-full ${cfg.bg} border flex items-center justify-center`}>
              <CheckCircle2 className="size-8 text-[#00A651]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Identity Verified</h2>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${cfg.bg} border ${cfg.color}`}>
              {cfg.icon}
              <span className="font-medium">{cfg.label}</span>
            </div>
            <p className="text-gray-600 text-sm">
              Your identity has been verified. You can now apply for a loan.
            </p>
            <Button
              onClick={() => setView('loan-apply')}
              className="w-full bg-[#00A651] hover:bg-[#008f45] text-white"
            >
              Apply for a Loan
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatus = kycStatus ? statusConfig[kycStatus] : null;

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => setView('dashboard')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#00A651] transition-colors cursor-pointer"
        >
          <ChevronLeft className="size-4" />
          Back to Dashboard
        </button>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-[#00A651] text-white flex items-center justify-center text-xs font-bold">
              <CheckCircle2 className="size-4" />
            </div>
            <span className="text-xs font-medium text-[#00A651] hidden sm:inline">Register</span>
          </div>
          <div className="w-8 h-0.5 bg-[#00A651]" />
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-[#00A651] text-white flex items-center justify-center text-xs font-bold">
              2
            </div>
            <span className="text-xs font-medium text-[#00A651] hidden sm:inline">KYC</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-300" />
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center text-xs font-bold">
              3
            </div>
            <span className="text-xs font-medium text-gray-400 hidden sm:inline">Loan</span>
          </div>
        </div>

        {/* KYC Status Banner (if already submitted but rejected) */}
        {currentStatus && kycStatus === 'rejected' && (
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${currentStatus.bg}`}>
            {currentStatus.icon}
            <div>
              <p className={`font-medium ${currentStatus.color}`}>{currentStatus.label}</p>
              <p className="text-sm text-gray-600">Please update your information and resubmit.</p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-[#333333]">KYC Verification</CardTitle>
            <CardDescription>
              Complete your identity verification to apply for loans
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Full Legal Name */}
            <div className="space-y-2">
              <Label htmlFor="legalName" className="flex items-center gap-2">
                <User className="size-4 text-[#00A651]" />
                Full Legal Name
              </Label>
              <Input
                id="legalName"
                placeholder="Enter your full legal name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="h-11"
              />
            </div>

            {/* National ID Number */}
            <div className="space-y-2">
              <Label htmlFor="nationalId" className="flex items-center gap-2">
                <CreditCard className="size-4 text-[#00A651]" />
                National ID Number
              </Label>
              <Input
                id="nationalId"
                placeholder="Enter your national ID number"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dob" className="flex items-center gap-2">
                <Calendar className="size-4 text-[#00A651]" />
                Date of Birth
              </Label>
              <Input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Residential Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="size-4 text-[#00A651]" />
                Residential Address
              </Label>
              <Textarea
                id="address"
                placeholder="Enter your residential address"
                value={residentialAddress}
                onChange={(e) => setResidentialAddress(e.target.value)}
                rows={3}
              />
            </div>

            <Separator />

            {/* ID Front Image */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="size-4 text-[#00A651]" />
                ID Front Image
              </Label>
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file, 'front');
                }}
              />
              {idFrontImage ? (
                <div className="relative rounded-lg overflow-hidden border-2 border-[#00A651]/30">
                  <img
                    src={idFrontImage}
                    alt="ID Front"
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
                    {idFrontName}
                  </div>
                  <button
                    onClick={() => { setIdFrontImage(''); setIdFrontName(''); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => frontInputRef.current?.click()}
                  onDrop={(e) => handleDrop(e, 'front')}
                  onDragOver={(e) => handleDragOver(e, 'front')}
                  onDragLeave={() => handleDragLeave('front')}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDraggingFront
                      ? 'border-[#00A651] bg-[#00A651]/5'
                      : 'border-gray-300 hover:border-[#00A651]/50 hover:bg-gray-50'
                  }`}
                >
                  <Upload className="size-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    {isDraggingFront ? 'Drop image here' : 'Click or drag to upload'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                </div>
              )}
            </div>

            {/* ID Back Image */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="size-4 text-[#00A651]" />
                ID Back Image
              </Label>
              <input
                ref={backInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file, 'back');
                }}
              />
              {idBackImage ? (
                <div className="relative rounded-lg overflow-hidden border-2 border-[#00A651]/30">
                  <img
                    src={idBackImage}
                    alt="ID Back"
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
                    {idBackName}
                  </div>
                  <button
                    onClick={() => { setIdBackImage(''); setIdBackName(''); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => backInputRef.current?.click()}
                  onDrop={(e) => handleDrop(e, 'back')}
                  onDragOver={(e) => handleDragOver(e, 'back')}
                  onDragLeave={() => handleDragLeave('back')}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDraggingBack
                      ? 'border-[#00A651] bg-[#00A651]/5'
                      : 'border-gray-300 hover:border-[#00A651]/50 hover:bg-gray-50'
                  }`}
                >
                  <Upload className="size-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    {isDraggingBack ? 'Drop image here' : 'Click or drag to upload'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-11 bg-[#00A651] hover:bg-[#008f45] text-white font-medium"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                <>
                  Submit Verification
                  <ChevronRight className="size-4 ml-1" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
