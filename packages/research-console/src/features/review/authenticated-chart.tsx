import { useEffect, useState } from "react";
import { ImageOff, LoaderCircle } from "lucide-react";

import { loadChartArtifact } from "./reviewer-api.ts";

export function AuthenticatedChart(props: {
  readonly artifactId: string;
  readonly panel: "context" | "detail";
}) {
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setSource(null);
    setError(null);
    void loadChartArtifact(props.artifactId).then(
      (loadedUrl) => {
        objectUrl = loadedUrl;
        if (active) {
          setSource(loadedUrl);
        } else {
          URL.revokeObjectURL(loadedUrl);
        }
      },
      (reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason : new Error(String(reason)));
        }
      },
    );
    return () => {
      active = false;
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
    };
  }, [props.artifactId]);

  if (error !== null) {
    return (
      <div className="chart-state error" role="alert">
        <ImageOff aria-hidden="true" />
        {error.message}
      </div>
    );
  }
  if (source === null) {
    return (
      <div className="chart-state" role="status">
        <LoaderCircle className="spin" aria-hidden="true" />
        Loading {props.panel} chart
      </div>
    );
  }
  return (
    <img
      className="review-chart"
      src={source}
      alt={`${props.panel === "context" ? "120-bar context" : "40-bar detail"} anonymous price chart`}
    />
  );
}
