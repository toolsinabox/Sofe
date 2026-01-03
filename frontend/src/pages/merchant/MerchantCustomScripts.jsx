import React, { useState, useEffect, useCallback } from 'react';
import { 
  Code, Save, RefreshCw, AlertCircle, Check, X, Info, Eye, EyeOff,
  FileCode, Braces, Hash, Copy, ExternalLink, Zap, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const MerchantCustomScripts = () => {
  const [scripts, setScripts] = useState({
    head_scripts: '',
    body_start_scripts: '',
    body_end_scripts: '',
    custom_css: '',
    google_analytics_id: '',
    google_tag_manager_id: '',
    facebook_pixel_id: '',
    tiktok_pixel_id: '',
    snapchat_pixel_id: '',
    pinterest_tag_id: '',
    custom_checkout_scripts: '',
    custom_thankyou_scripts: '',
    scripts_enabled: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState('');

  const fetchScripts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/store/custom-scripts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setScripts(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error fetching scripts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/store/custom-scripts`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scripts)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Scripts saved successfully!' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.detail || 'Failed to save scripts' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving scripts' });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const scriptTemplates = {
    googleAnalytics: `<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>`,
    facebookPixel: `<!-- Facebook Pixel -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>`,
    hotjar: `<!-- Hotjar Tracking Code -->
<script>
    (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:YOUR_HOTJAR_ID,hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
</script>`,
    livechat: `<!-- LiveChat Widget -->
<script>
    window.__lc = window.__lc || {};
    window.__lc.license = YOUR_LICENSE_ID;
    ;(function(n,t,c){function i(n){return e._h?e._h.apply(null,n):e._q.push(n)}var e={_q:[],_h:null,_v:"2.0",on:function(){i(["on",c.call(arguments)])},once:function(){i(["once",c.call(arguments)])},off:function(){i(["off",c.call(arguments)])},get:function(){if(!e._h)throw new Error("[LiveChatWidget] You can't use getters before load.");return i(["get",c.call(arguments)])},call:function(){i(["call",c.call(arguments)])},init:function(){var n=t.createElement("script");n.async=!0,n.type="text/javascript",n.src="https://cdn.livechatinc.com/tracking.js",t.head.appendChild(n)}};!n.__lc.asyncInit&&e.init(),n.LiveChatWidget=n.LiveChatWidget||e}(window,document,[].slice))
</script>`
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="merchant-custom-scripts">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Scripts</h1>
          <p className="text-gray-500 mt-1">Add tracking codes, analytics, and custom scripts to your store</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={scripts.scripts_enabled}
              onCheckedChange={(checked) => setScripts({ ...scripts, scripts_enabled: checked })}
            />
            <Label className="text-gray-700">Scripts Enabled</Label>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-cyan-600 hover:to-blue-700 text-gray-900"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Warning if scripts disabled */}
      {!scripts.scripts_enabled && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-700" />
              <p className="text-yellow-700">Scripts are currently disabled. Enable them above to activate your tracking codes.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="tracking" className="space-y-6">
        <TabsList className="bg-white border border-gray-300">
          <TabsTrigger value="tracking" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600">
            <Zap className="w-4 h-4 mr-2" />
            Tracking Pixels
          </TabsTrigger>
          <TabsTrigger value="scripts" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600">
            <Code className="w-4 h-4 mr-2" />
            Custom Scripts
          </TabsTrigger>
          <TabsTrigger value="css" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600">
            <Braces className="w-4 h-4 mr-2" />
            Custom CSS
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600">
            <FileCode className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Tracking Pixels Tab */}
        <TabsContent value="tracking" className="space-y-6">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Analytics & Tracking
              </CardTitle>
              <CardDescription className="text-gray-500">
                Connect your analytics and marketing pixels for tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Google Analytics */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 flex items-center gap-2">
                    <img src="https://www.gstatic.com/analytics-suite/header/suite/v2/ic_analytics.svg" alt="GA" className="w-4 h-4" />
                    Google Analytics ID
                  </Label>
                  <Input
                    value={scripts.google_analytics_id}
                    onChange={(e) => setScripts({ ...scripts, google_analytics_id: e.target.value })}
                    placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X"
                    className="bg-white border-gray-300 text-gray-900 font-mono"
                  />
                  <p className="text-xs text-gray-500">Find in GA4: Admin → Data Streams → Measurement ID</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 flex items-center gap-2">
                    <img src="https://www.gstatic.com/analytics-suite/header/suite/v2/ic_tag_manager.svg" alt="GTM" className="w-4 h-4" />
                    Google Tag Manager ID
                  </Label>
                  <Input
                    value={scripts.google_tag_manager_id}
                    onChange={(e) => setScripts({ ...scripts, google_tag_manager_id: e.target.value })}
                    placeholder="GTM-XXXXXXX"
                    className="bg-white border-gray-300 text-gray-900 font-mono"
                  />
                  <p className="text-xs text-gray-500">Container ID from your GTM workspace</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-gray-900 font-medium mb-4">Social Media Pixels</h3>
                <div className="grid grid-cols-2 gap-6">
                  {/* Facebook Pixel */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook Pixel ID
                    </Label>
                    <Input
                      value={scripts.facebook_pixel_id}
                      onChange={(e) => setScripts({ ...scripts, facebook_pixel_id: e.target.value })}
                      placeholder="XXXXXXXXXXXXXXXXX"
                      className="bg-white border-gray-300 text-gray-900 font-mono"
                    />
                  </div>

                  {/* TikTok Pixel */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                      </svg>
                      TikTok Pixel ID
                    </Label>
                    <Input
                      value={scripts.tiktok_pixel_id}
                      onChange={(e) => setScripts({ ...scripts, tiktok_pixel_id: e.target.value })}
                      placeholder="XXXXXXXXXXXXXXXXX"
                      className="bg-white border-gray-300 text-gray-900 font-mono"
                    />
                  </div>

                  {/* Snapchat Pixel */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-700" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
                      </svg>
                      Snapchat Pixel ID
                    </Label>
                    <Input
                      value={scripts.snapchat_pixel_id}
                      onChange={(e) => setScripts({ ...scripts, snapchat_pixel_id: e.target.value })}
                      placeholder="XXXXXXXX-XXXX-XXXX-XXXX"
                      className="bg-white border-gray-300 text-gray-900 font-mono"
                    />
                  </div>

                  {/* Pinterest Tag */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
                      </svg>
                      Pinterest Tag ID
                    </Label>
                    <Input
                      value={scripts.pinterest_tag_id}
                      onChange={(e) => setScripts({ ...scripts, pinterest_tag_id: e.target.value })}
                      placeholder="XXXXXXXXXXXXX"
                      className="bg-white border-gray-300 text-gray-900 font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Scripts Tab */}
        <TabsContent value="scripts" className="space-y-6">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-600" />
                Custom Script Injection
              </CardTitle>
              <CardDescription className="text-gray-500">
                Add custom JavaScript to different parts of your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Head Scripts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-700 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-purple-400" />
                    Head Scripts
                    <span className="text-xs text-gray-500">(Before &lt;/head&gt;)</span>
                  </Label>
                </div>
                <Textarea
                  value={scripts.head_scripts}
                  onChange={(e) => setScripts({ ...scripts, head_scripts: e.target.value })}
                  placeholder="<!-- Scripts added to the <head> section -->"
                  className="bg-white border-gray-300 text-gray-900 font-mono text-sm resize-none"
                  rows={6}
                />
                <p className="text-xs text-gray-500">Best for: Meta tags, preload scripts, CSS links, analytics that need early loading</p>
              </div>

              {/* Body Start Scripts */}
              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-green-400" />
                  Body Start Scripts
                  <span className="text-xs text-gray-500">(After &lt;body&gt;)</span>
                </Label>
                <Textarea
                  value={scripts.body_start_scripts}
                  onChange={(e) => setScripts({ ...scripts, body_start_scripts: e.target.value })}
                  placeholder="<!-- Scripts added right after <body> -->"
                  className="bg-white border-gray-300 text-gray-900 font-mono text-sm resize-none"
                  rows={6}
                />
                <p className="text-xs text-gray-500">Best for: Google Tag Manager noscript, urgency bars, announcement banners</p>
              </div>

              {/* Body End Scripts */}
              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-orange-400" />
                  Body End Scripts
                  <span className="text-xs text-gray-500">(Before &lt;/body&gt;)</span>
                </Label>
                <Textarea
                  value={scripts.body_end_scripts}
                  onChange={(e) => setScripts({ ...scripts, body_end_scripts: e.target.value })}
                  placeholder="<!-- Scripts added before </body> -->"
                  className="bg-white border-gray-300 text-gray-900 font-mono text-sm resize-none"
                  rows={6}
                />
                <p className="text-xs text-gray-500">Best for: Chat widgets, tracking pixels, third-party integrations</p>
              </div>

              {/* Page-Specific Scripts */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-gray-900 font-medium mb-4">Page-Specific Scripts</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Checkout Page Scripts</Label>
                    <Textarea
                      value={scripts.custom_checkout_scripts}
                      onChange={(e) => setScripts({ ...scripts, custom_checkout_scripts: e.target.value })}
                      placeholder="<!-- Scripts for checkout page only -->"
                      className="bg-white border-gray-300 text-gray-900 font-mono text-sm resize-none"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700">Thank You Page Scripts</Label>
                    <Textarea
                      value={scripts.custom_thankyou_scripts}
                      onChange={(e) => setScripts({ ...scripts, custom_thankyou_scripts: e.target.value })}
                      placeholder="<!-- Scripts for order confirmation -->"
                      className="bg-white border-gray-300 text-gray-900 font-mono text-sm resize-none"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500">Use for conversion tracking: fbq(&apos;track&apos;, &apos;Purchase&apos;);</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom CSS Tab */}
        <TabsContent value="css" className="space-y-6">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Braces className="w-5 h-5 text-blue-600" />
                Custom CSS
              </CardTitle>
              <CardDescription className="text-gray-500">
                Add custom styles to customize your store&apos;s appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-700 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Tips for Custom CSS</p>
                    <ul className="list-disc list-inside mt-1 text-blue-700/80">
                      <li>Use <code className="bg-blue-500/20 px-1 rounded">!important</code> sparingly to override theme styles</li>
                      <li>Test on both desktop and mobile views</li>
                      <li>Use browser DevTools to find element selectors</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Textarea
                value={scripts.custom_css}
                onChange={(e) => setScripts({ ...scripts, custom_css: e.target.value })}
                placeholder={`/* Custom CSS styles */
.product-title {
  font-size: 24px;
  color: #333;
}

.btn-primary {
  background: linear-gradient(135deg, #06b6d4, #3b82f6);
}`}
                className="bg-gray-900 border-gray-300 text-green-400 font-mono text-sm resize-none"
                rows={20}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-600" />
                Script Templates
              </CardTitle>
              <CardDescription className="text-gray-500">
                Copy and customize these common script templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="ga4" className="border border-gray-300 rounded-lg px-4">
                  <AccordionTrigger className="text-gray-700 hover:text-gray-900">
                    <div className="flex items-center gap-3">
                      <img src="https://www.gstatic.com/analytics-suite/header/suite/v2/ic_analytics.svg" alt="GA" className="w-5 h-5" />
                      Google Analytics 4
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2">
                      <pre className="bg-gray-900 p-4 rounded-lg text-xs text-green-400 overflow-x-auto">
                        {scriptTemplates.googleAnalytics}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(scriptTemplates.googleAnalytics, 'ga4')}
                        className="mt-3 border-gray-300 text-gray-700"
                      >
                        {copied === 'ga4' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied === 'ga4' ? 'Copied!' : 'Copy Code'}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="fbpixel" className="border border-gray-300 rounded-lg px-4">
                  <AccordionTrigger className="text-gray-700 hover:text-gray-900">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook Pixel
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2">
                      <pre className="bg-gray-900 p-4 rounded-lg text-xs text-green-400 overflow-x-auto">
                        {scriptTemplates.facebookPixel}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(scriptTemplates.facebookPixel, 'fb')}
                        className="mt-3 border-gray-300 text-gray-700"
                      >
                        {copied === 'fb' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied === 'fb' ? 'Copied!' : 'Copy Code'}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="hotjar" className="border border-gray-300 rounded-lg px-4">
                  <AccordionTrigger className="text-gray-700 hover:text-gray-900">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 bg-orange-500 rounded text-gray-900 text-xs flex items-center justify-center font-bold">H</span>
                      Hotjar Heatmaps
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2">
                      <pre className="bg-gray-900 p-4 rounded-lg text-xs text-green-400 overflow-x-auto">
                        {scriptTemplates.hotjar}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(scriptTemplates.hotjar, 'hotjar')}
                        className="mt-3 border-gray-300 text-gray-700"
                      >
                        {copied === 'hotjar' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied === 'hotjar' ? 'Copied!' : 'Copy Code'}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="livechat" className="border border-gray-300 rounded-lg px-4">
                  <AccordionTrigger className="text-gray-700 hover:text-gray-900">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 bg-green-500 rounded text-gray-900 text-xs flex items-center justify-center font-bold">💬</span>
                      LiveChat Widget
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2">
                      <pre className="bg-gray-900 p-4 rounded-lg text-xs text-green-400 overflow-x-auto">
                        {scriptTemplates.livechat}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(scriptTemplates.livechat, 'livechat')}
                        className="mt-3 border-gray-300 text-gray-700"
                      >
                        {copied === 'livechat' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied === 'livechat' ? 'Copied!' : 'Copy Code'}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MerchantCustomScripts;
