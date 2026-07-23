import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface ImageWithSkeletonProps extends React.ComponentProps<"img"> {
  containerClassName?: string
}

/** `<img>` that shows a skeleton until the image actually finishes loading, instead of a blank gap or layout jump. */
export function ImageWithSkeleton({ className, containerClassName, style, onLoad, onError, ...props }: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    setLoaded(false)
    setFailed(false)
  }, [props.src])

  return (
    <span className={cn("relative block", containerClassName)}>
      {!loaded && !failed && <Skeleton className="absolute inset-0" />}
      <img
        {...props}
        className={className}
        // Opacity fade lives in inline style (not a Tailwind transition-* class) so it never
        // collides with a caller's own transition/transform utilities (e.g. zoom scaling).
        style={{ ...style, opacity: loaded ? 1 : 0, transition: "opacity 300ms" }}
        onLoad={(e) => {
          setLoaded(true)
          onLoad?.(e)
        }}
        onError={(e) => {
          setFailed(true)
          onError?.(e)
        }}
      />
    </span>
  )
}
