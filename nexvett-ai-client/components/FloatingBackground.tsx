import { useRef } from "react";
import { Box } from "@mantine/core";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export function FloatingBackground() {
    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (!containerRef.current) return;

        const shapes = containerRef.current.querySelectorAll(".floating-shape");

        // Random initial position and floating animation
        shapes.forEach((shape) => {
            gsap.set(shape, {
                x: gsap.utils.random(0, window.innerWidth),
                y: gsap.utils.random(0, window.innerHeight),
                scale: gsap.utils.random(0.5, 1.5),
                opacity: gsap.utils.random(0.1, 0.3),
            });

            gsap.to(shape, {
                x: `+=${gsap.utils.random(-100, 100)}`,
                y: `+=${gsap.utils.random(-100, 100)}`,
                rotation: gsap.utils.random(-180, 180),
                duration: gsap.utils.random(10, 20),
                repeat: -1,
                yoyo: true,
                ease: "none",
            });
        });

        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const xPos = (clientX / window.innerWidth - 0.5) * 40;
            const yPos = (clientY / window.innerHeight - 0.5) * 40;

            gsap.to(shapes, {
                xPercent: xPos,
                yPercent: yPos,
                duration: 2,
                ease: "power2.out",
                stagger: 0.02,
            });
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, { scope: containerRef });

    return (
        <Box
            ref={containerRef}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: -1,
                overflow: "hidden",
                pointerEvents: "none",
                background: "transparent",
            }}
        >
            {[...Array(15)].map((_, i) => (
                <Box
                    key={i}
                    className="floating-shape"
                    style={{
                        position: "absolute",
                        width: gsap.utils.random(50, 200),
                        height: gsap.utils.random(50, 200),
                        borderRadius: i % 2 === 0 ? "50%" : "30% 70% 70% 30% / 30% 30% 70% 70%",
                        background: i % 3 === 0
                            ? "linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(236, 72, 153, 0.4) 100%)"
                            : i % 3 === 1
                                ? "linear-gradient(135deg, rgba(14, 165, 233, 0.4) 0%, rgba(139, 92, 246, 0.4) 100%)"
                                : "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
                        filter: "blur(40px)",
                        mixBlendMode: "screen",
                    }}
                />
            ))}
        </Box>
    );
}
