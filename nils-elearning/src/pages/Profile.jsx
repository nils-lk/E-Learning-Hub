import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  User, Mail, Phone, MapPin, CreditCard, 
  UserCheck, Save, Shield, BadgeCheck, AlertCircle
} from 'lucide-react';

const Profile = () => {
  const { user, profile, fetchProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [form, setForm] = useState({
    full_name: '',
    name_with_initials: '',
    nic: '',
    gender: 'male',
    phone: '',
    address: '',
    bio: '',
    date_of_birth: ''
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        name_with_initials: profile.name_with_initials || '',
        nic: profile.nic || '',
        gender: profile.gender || 'male',
        phone: profile.phone || '',
        address: profile.address || '',
        bio: profile.bio || '',
        date_of_birth: profile.date_of_birth || ''
      });
    }
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    // Clean up data: Convert empty strings to null for database compatibility
    const payload = { ...form };
    Object.keys(payload).forEach(key => {
      if (payload[key] === '') payload[key] = null;
    });

    try {
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      await fetchProfile(user.id);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div className="pt-24 flex justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Account Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your personal information and certificate details.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sidebar Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-nilsBlue-600 to-nilsBlue-800 mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
                {profile.full_name?.[0] || profile.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <h2 className="font-bold text-gray-900 dark:text-white truncate">{profile.full_name || 'No Name Set'}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-4">{profile.email}</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-nilsBlue-50 dark:bg-nilsBlue-900/30 text-nilsBlue-700 dark:text-nilsBlue-300 text-xs font-bold uppercase tracking-wider">
                <Shield className="w-3 h-3" /> {profile.role || 'Student'}
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-nilsGold" /> Certificate Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">NIC Verified</span>
                  <span className={profile.nic ? 'text-emerald-500 font-medium' : 'text-gray-400'}>
                    {profile.nic ? 'Provided' : 'Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Official Name</span>
                  <span className={profile.name_with_initials ? 'text-emerald-500 font-medium' : 'text-gray-400'}>
                    {profile.name_with_initials ? 'Set' : 'Missing'}
                  </span>
                </div>
              </div>
              {!profile.nic && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-xl flex gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Your NIC is required to issue valid course certificates.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSave} className="space-y-6">
              
              {/* Profile Details */}
              <div className="glass-card p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-nilsBlue-600" /> Personal Details
                </h3>
                
                {message.text && (
                  <div className={`mb-6 p-4 rounded-xl border text-sm ${
                    message.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-800 dark:text-emerald-400' 
                      : 'bg-red-50 border-red-100 text-red-700 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Display Name / Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        value={form.full_name}
                        onChange={e => setForm({...form, full_name: e.target.value})}
                        className="form-input pl-10" 
                        placeholder="e.g. John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        value={profile.email} 
                        disabled 
                        className="form-input pl-10 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed" 
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">Email cannot be changed.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        value={form.phone}
                        onChange={e => setForm({...form, phone: e.target.value})}
                        className="form-input pl-10" 
                        placeholder="e.g. 0771234567"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Certificate Information */}
              <div className="glass-card p-6 border-l-4 border-nilsGold">
                <h3 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-nilsGold" /> Certificate Information
                </h3>
                <p className="text-xs text-gray-500 mb-6 font-medium uppercase tracking-tight">Required for official document generation</p>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Name with Initials
                      {profile.name_with_initials && profile.role === 'user' && (
                        <span className="ml-2 text-[10px] text-amber-600 font-normal">(Locked - Contact Admin to change)</span>
                      )}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        value={form.name_with_initials}
                        onChange={e => setForm({...form, name_with_initials: e.target.value})}
                        disabled={profile.name_with_initials && (profile.role !== 'admin' && profile.role !== 'superadmin')}
                        className={`form-input pl-10 ${profile.name_with_initials && (profile.role !== 'admin' && profile.role !== 'superadmin') ? 'bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed' : ''}`}
                        placeholder="e.g. A.B.C. Perera"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        NIC Number
                        {profile.nic && profile.role === 'user' && (
                          <span className="ml-2 text-[10px] text-amber-600 font-normal">(Locked)</span>
                        )}
                      </label>
                      <div className="relative">
                        <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          value={form.nic}
                          onChange={e => setForm({...form, nic: e.target.value.toUpperCase()})}
                          disabled={profile.nic && (profile.role !== 'admin' && profile.role !== 'superadmin')}
                          className={`form-input pl-10 uppercase ${profile.nic && (profile.role !== 'admin' && profile.role !== 'superadmin') ? 'bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed' : ''}`}
                          placeholder="e.g. 199912345678"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date of Birth</label>
                      <input 
                        type="date"
                        value={form.date_of_birth}
                        onChange={e => setForm({...form, date_of_birth: e.target.value})}
                        className="form-input" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Gender</label>
                      <select 
                        value={form.gender}
                        onChange={e => setForm({...form, gender: e.target.value})}
                        className="form-input bg-white dark:bg-gray-800"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Permanent Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <textarea 
                        value={form.address}
                        onChange={e => setForm({...form, address: e.target.value})}
                        rows={3}
                        className="form-input pl-10 resize-none" 
                        placeholder="Enter your full address..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio (Optional) */}
              {profile.role === 'lecturer' && (
                <div className="glass-card p-6">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" /> Lecturer Biography
                  </h3>
                  <textarea 
                    value={form.bio}
                    onChange={e => setForm({...form, bio: e.target.value})}
                    rows={4}
                    className="form-input resize-none" 
                    placeholder="Tell your students about yourself, your expertise, and your background..."
                  />
                  <p className="text-[10px] text-gray-400 mt-2">This will be shown on the course details page.</p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="btn-primary px-8 py-3.5 justify-center min-w-[160px]"
                >
                  {saving ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save All Changes</>
                  )}
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
