import { useEffect, useState } from "react";
import api from "@/services/api";

/**
 * ProfileAvatar
 *
 * Fetches an authenticated binary photo from the API and renders it.
 * Falls back to a placeholder icon if the photo does not exist or errors.
 *
 * @param {string} src        - The API path, e.g. "/patients/{id}/profile-photo"
 * @param {string} alt        - Alt text for the image
 * @param {string} className  - Tailwind classes for the wrapper div
 * @param {React.ReactNode} fallback - Element to render when no photo is available
 */
export default function ProfileAvatar({ src, alt = "Profile", className = "", fallback = null }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [failedForSrc, setFailedForSrc] = useState(null);
  const [objectUrlForSrc, setObjectUrlForSrc] = useState(null);

  useEffect(() => {
    if (!src) {
      return;
    }

    let revoked = false;
    let blobUrl = null;

    api
      .get(src, { responseType: "blob" })
      .then((res) => {
        if (revoked) return;
        blobUrl = URL.createObjectURL(res.data);
        setObjectUrl(blobUrl);
        setObjectUrlForSrc(src);
        setFailedForSrc(null);
      })
      .catch(() => {
        if (!revoked) {
          setFailedForSrc(src);
          setObjectUrlForSrc(src);
        }
      });

    return () => {
      revoked = true;
      // Clean up object URL to avoid memory leaks
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src]);

  const wrapperClass = `relative overflow-hidden ${className}`;

  const failed = failedForSrc === src;
  const hasObjectUrlForCurrentSrc = objectUrlForSrc === src && Boolean(objectUrl);

  if (!src || failed) {
    return (
      <div className={`${wrapperClass} flex items-center justify-center bg-muted`}>
        {fallback}
      </div>
    );
  }

  if (!hasObjectUrlForCurrentSrc) {
    // Loading skeleton pulse
    return <div className={`${wrapperClass} bg-muted animate-pulse`} />;
  }

  return (
    <div className={wrapperClass}>
      <img
        src={objectUrl}
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => setFailedForSrc(src)}
      />
    </div>
  );
}
