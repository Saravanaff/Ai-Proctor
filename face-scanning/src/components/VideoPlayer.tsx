import React, { useState, useEffect, useRef } from "react";

interface VideoPlayerProps {
  category: string;
  title: string;
  isSelected?: boolean;
  onSelect?: () => void;
  user: { id: number; name: string; email: string } | null;
  examDetails: {
    id: number;
    exam_name: string;
    key: number;
    createdAt: string;
    updatedAt: string;
  } | null;
  videosAvailability: { [key: string]: boolean };
  checkingVideoAvailability: boolean;
  baseUrl: string | undefined;
  onVideoDownload: (category: string) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  category,
  title,
  isSelected = false,
  onSelect,
  user,
  examDetails,
  videosAvailability,
  checkingVideoAvailability,
  baseUrl,
  onVideoDownload,
  videoRef,
}) => {
  const [localVideoError, setLocalVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Reset states when category changes or becomes unselected
  useEffect(() => {
    if (!isSelected) {
      setLocalVideoError(null);
      setIsVideoLoading(false);
      setVideoReady(false);
      setRetryCount(0);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, [isSelected, category]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  if (!user || !examDetails || !baseUrl) {
    console.warn(
      `VideoPlayer: Missing user (${!!user}), examDetails (${!!examDetails}), or baseUrl (${!!baseUrl}) for ${category}`
    );
    return null;
  }

  const videoStreamUrl = `${baseUrl}/stream-video/${user.id}/${examDetails.id}/${category}`;
  const isVideoAvailable = videosAvailability[category];

  // Enhanced error handling
  const handleVideoError = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const target = event.target as HTMLVideoElement;
    setIsVideoLoading(false);
    setVideoReady(false);

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    let errorMessage = "Failed to load video";

    if (target.error) {
      switch (target.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = "Video loading was cancelled";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = "Network error or video not found";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = "Video format error - unable to decode";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "Video format not supported by browser";
          break;
        default:
          errorMessage = `Video error (code: ${target.error.code})`;
      }
    }

    console.error(`Video error for ${category}:`, errorMessage, target.error);
    setLocalVideoError(errorMessage);

    // Auto-retry logic for network errors (max 3 attempts)
    if (target.error?.code === MediaError.MEDIA_ERR_NETWORK && retryCount < 3) {
      console.log(
        `Retrying video load for ${category} (attempt ${retryCount + 1})`
      );
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setLocalVideoError(null);
        target.load();
      }, 2000 * (retryCount + 1)); // Exponential backoff
    }
  };

  const handleVideoLoadStart = () => {
    if (isSelected) {
      setIsVideoLoading(true);
      setLocalVideoError(null);
      setVideoReady(false);

      // Show loading state after brief delay to prevent flicker
      loadingTimeoutRef.current = setTimeout(() => {
        setIsVideoLoading(true);
      }, 300);

      console.log(`Loading video: ${category}`);
    }
  };

  const handleVideoLoadedData = () => {
    if (isSelected) {
      setIsVideoLoading(false);
      setVideoReady(true);
      setLocalVideoError(null);

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      // Ensure video reference is properly set for seeking
      if (videoRef && videoElementRef.current) {
        (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current =
          videoElementRef.current;
      }

      console.log(`Video ready: ${category}`, {
        duration: videoElementRef.current?.duration,
        readyState: videoElementRef.current?.readyState,
      });
    }
  };

  const handleVideoCanPlay = () => {
    if (isSelected) {
      setIsVideoLoading(false);
      setVideoReady(true);

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      // Ensure video reference is properly set for seeking
      if (videoRef && videoElementRef.current) {
        (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current =
          videoElementRef.current;
      }
    }
  };

  const handleVideoWaiting = () => {
    if (isSelected && videoReady) {
      setIsVideoLoading(true);
    }
  };

  const handleVideoPlaying = () => {
    if (isSelected) {
      setIsVideoLoading(false);
    }
  };

  const handleRetryLoad = () => {
    if (videoElementRef.current) {
      setLocalVideoError(null);
      setRetryCount(0);
      videoElementRef.current.load();
    }
  };

  return (
    <div
      style={{
        border: isSelected
          ? "2px solid var(--primary-color)"
          : "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
        backgroundColor: isSelected
          ? "rgba(var(--primary-color-rgb), 0.05)"
          : "white",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <span style={{ fontWeight: "bold", fontSize: "1rem" }}>{title}</span>
        <div style={{ display: "flex", gap: "8px" }}>
          {checkingVideoAvailability ? (
            <span
              style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
            >
              Checking availability...
            </span>
          ) : !isVideoAvailable ? (
            <span style={{ fontSize: "0.8rem", color: "var(--error-color)" }}>
              ❌ Not available
            </span>
          ) : (
            <>
              <button
                onClick={() => {
                  onSelect?.();
                  if (!isSelected) {
                    setLocalVideoError(null);
                    setIsVideoLoading(false);
                    setVideoReady(false);
                  }
                }}
                disabled={!isVideoAvailable}
                style={{
                  backgroundColor: isSelected
                    ? "var(--primary-color)"
                    : "transparent",
                  color: isSelected ? "white" : "var(--primary-color)",
                  border: "1px solid var(--primary-color)",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  transition: "all 0.2s ease",
                }}
              >
                {isSelected ? "✓ Selected" : "Select"}
              </button>
              <button
                onClick={() => onVideoDownload(category)}
                disabled={!isVideoAvailable}
                style={{
                  backgroundColor: "var(--success-color, #28a745)",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  transition: "all 0.2s ease",
                }}
                title="Download video file"
              >
                📥 Download
              </button>
            </>
          )}
        </div>
      </div>

      {/* Video Container */}
      {isSelected && isVideoAvailable && (
        <div className="videoContainer" style={{ position: "relative" }}>
          {/* Loading Overlay */}
          {isVideoLoading && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 0, 0, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                borderRadius: "8px",
                color: "white",
                fontSize: "1rem",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    border: "3px solid rgba(255,255,255,0.3)",
                    borderTop: "3px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 12px",
                  }}
                />
                <div>Loading video...</div>
                {retryCount > 0 && (
                  <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                    Retry attempt: {retryCount}/3
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {localVideoError && (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                background: "rgba(255, 0, 0, 0.1)",
                border: "1px solid rgba(255, 0, 0, 0.3)",
                borderRadius: "8px",
                color: "var(--error-color, #dc3545)",
              }}
            >
              <div style={{ marginBottom: "12px", fontSize: "1.5rem" }}>⚠️</div>
              <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                Video Error
              </div>
              <div style={{ fontSize: "0.9rem", marginBottom: "12px" }}>
                {localVideoError}
              </div>
              <button
                onClick={handleRetryLoad}
                style={{
                  padding: "8px 16px",
                  background: "var(--error-color, #dc3545)",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  marginRight: "8px",
                }}
              >
                Retry Loading
              </button>
              <button
                onClick={() => onVideoDownload(category)}
                style={{
                  padding: "8px 16px",
                  background: "var(--primary-color, #007bff)",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Download Video
              </button>
            </div>
          )}

          {/* Video Element */}
          {!localVideoError && (
            <video
              ref={(el) => {
                videoElementRef.current = el;
                if (videoRef && isSelected && el) {
                  (
                    videoRef as React.MutableRefObject<HTMLVideoElement | null>
                  ).current = el;
                }
              }}
              key={`${category}-${user.id}-${examDetails.id}`}
              controls
              width="100%"
              height="350"
              onLoadStart={handleVideoLoadStart}
              onLoadedData={handleVideoLoadedData}
              onCanPlay={handleVideoCanPlay}
              onWaiting={handleVideoWaiting}
              onPlaying={handleVideoPlaying}
              onError={handleVideoError}
              style={{
                backgroundColor: "#000",
                borderRadius: "8px",
                width: "100%",
                height: "350px",
                objectFit: "contain",
              }}
              preload="metadata"
              playsInline
              crossOrigin="anonymous"
            >
              <source src={videoStreamUrl} type="video/mp4" />
              <p>
                Your browser doesn't support HTML video. You can{" "}
                <a
                  href={videoStreamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  download the video
                </a>{" "}
                instead.
              </p>
            </video>
          )}

          {/* Video Status Info */}
          {isSelected && !localVideoError && videoReady && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "0.8rem",
                color: "var(--text-secondary, #6c757d)",
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              💡 Click on violations in the timeline to jump to specific
              timestamps
            </div>
          )}
        </div>
      )}

      {/* No Video Available State */}
      {isSelected && !isVideoAvailable && (
        <div style={{ position: "relative" }}>
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-secondary, #6c757d)",
              fontSize: "0.9rem",
              fontStyle: "italic",
              background: "rgba(0,0,0,0.02)",
              borderRadius: "8px",
              border: "1px dashed var(--border-color, #dee2e6)",
            }}
          >
            <div style={{ marginBottom: "12px", fontSize: "2rem" }}>📹</div>
            <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
              No Video Data Available
            </div>
            <div>
              This video category was not recorded during the exam session.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
