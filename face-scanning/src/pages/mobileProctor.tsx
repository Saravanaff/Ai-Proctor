import { useEffect, useRef, useState } from 'react';
import { Eye, Shield, Camera, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SurveillanceInterface() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showInitialNotice, setShowInitialNotice] = useState(true);
  const [showSurveillanceNotice, setShowSurveillanceNotice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitialNotice(false);
      setShowSurveillanceNotice(true);
      setIsRecording(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        toast({
          title: "Camera Access Denied",
          description: "Please allow camera access for monitoring.",
          variant: "destructive"
        });
      }
    };

    startCamera();

    const handleVisibility = () => {
      if (document.hidden) {
        toast({
          title: "⚠️ Security Alert",
          description: "Tab switching detected. Please stay on the proctoring page.",
          variant: "destructive"
        });
      }
    };

    const handleResize = () => {
      if (window.innerHeight !== screen.height) {
        toast({
          title: "⚠️ Security Alert", 
          description: "Fullscreen mode required. Please return to fullscreen.",
          variant: "destructive"
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
    };
  }, [toast]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f7fa',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Initial "Third Eye Activated" Notice */}
      {showInitialNotice && (
        <div style={{
          position: 'fixed',
          top: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            border: '1px solid #1d4ed8',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye style={{ width: '20px', height: '20px' }} />
              <span style={{ fontWeight: '500' }}>
                Third Eye Activated
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Surveillance Status Panel */}
      {showSurveillanceNotice && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999
        }}>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            width: '256px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#dc2626',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Shield style={{ width: '20px', height: '20px', color: 'white' }} />
                </div>
                {isRecording && (
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#dc2626',
                    borderRadius: '50%'
                  }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  color: '#dc2626',
                  fontWeight: '600',
                  marginBottom: '4px',
                  fontSize: '16px'
                }}>
                  Under Surveillance
                </h3>
                <p style={{
                  color: '#6b7280',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}>
                  Third Eye monitoring active
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#dc2626'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#dc2626',
                    borderRadius: '50%'
                  }} />
                  <span>RECORDING</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Video Container */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '768px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Camera style={{ width: '24px', height: '24px', color: '#2563eb' }} />
              <div>
                <h1 style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#111827',
                  margin: 0
                }}>
                  Surveillance Feed
                </h1>
                <p style={{
                  color: '#6b7280',
                  fontSize: '14px',
                  margin: 0
                }}>
                  Live monitoring in progress
                </p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#dcfce7',
              padding: '4px 12px',
              borderRadius: '9999px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#10b981',
                borderRadius: '50%'
              }} />
              <span style={{
                color: '#059669',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                ONLINE
              </span>
            </div>
          </div>

          {/* Video Feed */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              backgroundColor: 'black'
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: 'auto',
                  objectFit: 'cover',
                  minHeight: '300px',
                  maxHeight: '500px'
                }}
              />

              {/* Recording Indicator */}
              {isRecording && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: '#dc2626',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'white',
                    borderRadius: '50%'
                  }} />
                  <span style={{
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    REC
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status Bar */}
          <div style={{
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                <span style={{ fontSize: '14px' }}>Face Detection: Active</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle style={{ width: '16px', height: '16px', color: '#d97706' }} />
                <span style={{ fontSize: '14px' }}>Motion Tracking: Enabled</span>
              </div>
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              backgroundColor: 'white',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              Session: THX-{Math.random().toString(36).substr(2, 6).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Security Indicators */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#10b981',
            borderRadius: '50%'
          }} />
          <span>Security: Active</span>
        </div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px'
        }}>
          <Eye style={{ width: '12px', height: '12px', color: '#2563eb' }} />
          <span>AI Vision: Online</span>
        </div>
      </div>
    </div>
  );
}