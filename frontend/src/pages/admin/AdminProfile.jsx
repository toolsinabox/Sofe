import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, Camera, Save, RefreshCw, 
  Building, Globe, Calendar, Shield, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminProfile = () => {
  const { token, user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    location: '',
    timezone: '',
    bio: '',
    avatar: '',
    website: ''
  });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.company || 'Celora Platform',
        position: user.position || 'Platform Administrator',
        location: user.location || '',
        timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        bio: user.bio || '',
        avatar: user.avatar || '',
        website: user.website || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/profile`, profile, { headers });
      
      // Update local user state
      const updatedUser = { ...user, ...profile };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // For now, use a placeholder - in production, upload to cloud storage
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile({ ...profile, avatar: reader.result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
        <p className="text-gray-400">Manage your personal information and preferences</p>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Profile Picture */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            Profile Picture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile.avatar ? (
                <img 
                  src={profile.avatar} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-cyan-500/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center border-4 border-cyan-500/30">
                  <User size={40} className="text-white" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-cyan-600 transition-colors">
                <Camera size={16} className="text-white" />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarUpload}
                  className="hidden" 
                />
              </label>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{profile.name || 'Admin User'}</h3>
              <p className="text-gray-400">{profile.position}</p>
              <p className="text-cyan-400 text-sm mt-1">{profile.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            Personal Information
          </CardTitle>
          <CardDescription className="text-gray-400">
            Your basic profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Full Name</Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white pl-10"
                  placeholder="admin@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white pl-10"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <Input
                  value={profile.website}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white pl-10"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Information */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-400" />
            Work Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Company / Organization</Label>
              <Input
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Company name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Position / Role</Label>
              <Input
                value={profile.position}
                onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Your role"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <Input
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white pl-10"
                  placeholder="City, Country"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Timezone</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <Input
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white pl-10"
                  placeholder="America/New_York"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">About Me</CardTitle>
          <CardDescription className="text-gray-400">
            A brief description about yourself
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white min-h-[120px]"
            placeholder="Tell us a bit about yourself..."
          />
          <p className="text-gray-500 text-sm mt-2">{profile.bio.length}/500 characters</p>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/30 rounded-lg">
              <p className="text-gray-400 text-sm">Account Type</p>
              <p className="text-white font-medium mt-1">Super Administrator</p>
            </div>
            <div className="p-4 bg-gray-800/30 rounded-lg">
              <p className="text-gray-400 text-sm">Account Status</p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-sm">
                <CheckCircle size={14} /> Active
              </span>
            </div>
            <div className="p-4 bg-gray-800/30 rounded-lg">
              <p className="text-gray-400 text-sm">Member Since</p>
              <p className="text-white font-medium mt-1">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="p-4 bg-gray-800/30 rounded-lg">
              <p className="text-gray-400 text-sm">Last Login</p>
              <p className="text-white font-medium mt-1">
                {new Date().toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="border-gray-700 text-gray-400 hover:text-white"
        >
          <RefreshCw size={16} className="mr-2" />
          Reset
        </Button>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
        >
          {saving ? (
            <>
              <RefreshCw size={16} className="mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AdminProfile;
