import { useEffect, useRef, useState, useCallback } from 'react';
import { RoomScene } from '../three/RoomScene';
import type { SectionId } from '../data/resume';

const IS_TOUCH = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
const JOYSTICK_RADIUS = 44;

interface ExperienceProps {
  openSection: SectionId | null;
  onSelect: (id: SectionId) => void;
  onLoadProgress: (ratio: number) => void;
  onReady: () => void;
}

export default function Experience({ openSection, onSelect, onLoadProgress, onReady }: ExperienceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<RoomScene | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [lookLabel, setLookLabel] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [everActivated, setEverActivated] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const scene = new RoomScene({
      canvas: canvasRef.current,
      onLookAt: setLookLabel,
      onSelect: (id) => onSelectRef.current(id),
      onLockChange: (locked) => {
        setActive(locked);
        if (locked) setEverActivated(true);
      },
      onTransition: setTransitioning,
      onLoadProgress,
      onReady,
    });
    sceneRef.current = scene;

    const handleResize = () => scene.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (openSection) {
      wasOpenRef.current = true;
      sceneRef.current?.pause();
    } else if (wasOpenRef.current) {
      // closing a panel: resume control immediately, no extra "click to resume" step
      wasOpenRef.current = false;
      sceneRef.current?.resume();
      if (IS_TOUCH) sceneRef.current?.activateTouch();
      else sceneRef.current?.requestLock();
    }
  }, [openSection]);

  const handleEnter = useCallback(() => {
    if (!everActivated) {
      sceneRef.current?.enter(IS_TOUCH);
    } else if (IS_TOUCH) {
      sceneRef.current?.activateTouch();
    } else {
      sceneRef.current?.requestLock();
    }
  }, [everActivated]);

  /* ---------------- mobile touch controls ---------------- */
  const joystickPointer = useRef<number | null>(null);
  const lookPointer = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  const onStagePointerDown = (e: React.PointerEvent) => {
    if (!IS_TOUCH || !active || openSection) return;
    const joyEl = joystickRef.current;
    if (joyEl && joyEl.contains(e.target as Node)) {
      joystickPointer.current = e.pointerId;
      return;
    }
    if ((e.target as HTMLElement).closest('.interact-btn')) return;
    lookPointer.current = e.pointerId;
    lastLookPos.current = { x: e.clientX, y: e.clientY };
  };

  const onStagePointerMove = (e: React.PointerEvent) => {
    if (!IS_TOUCH) return;
    if (e.pointerId === joystickPointer.current && joystickRef.current) {
      const rect = joystickRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const mag = Math.hypot(dx, dy);
      if (mag > JOYSTICK_RADIUS) {
        dx = (dx / mag) * JOYSTICK_RADIUS;
        dy = (dy / mag) * JOYSTICK_RADIUS;
      }
      if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      sceneRef.current?.setTouchMove(dx / JOYSTICK_RADIUS, -dy / JOYSTICK_RADIUS);
    } else if (e.pointerId === lookPointer.current) {
      const dx = e.clientX - lastLookPos.current.x;
      const dy = e.clientY - lastLookPos.current.y;
      lastLookPos.current = { x: e.clientX, y: e.clientY };
      sceneRef.current?.touchLook(dx, dy);
    }
  };

  const onStagePointerUp = (e: React.PointerEvent) => {
    if (e.pointerId === joystickPointer.current) {
      joystickPointer.current = null;
      sceneRef.current?.setTouchMove(0, 0);
      if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)';
    }
    if (e.pointerId === lookPointer.current) lookPointer.current = null;
  };

  const showOverlay = !active && !openSection;
  const showHud = active && !openSection;

  return (
    <div
      className="stage"
      ref={stageRef}
      onPointerDown={onStagePointerDown}
      onPointerMove={onStagePointerMove}
      onPointerUp={onStagePointerUp}
      onPointerCancel={onStagePointerUp}
    >
      <canvas ref={canvasRef} id="room-canvas" />

      <div className={`transition-fade${transitioning ? ' active' : ''}`} />

      {showHud && (
        <>
          <div className="crosshair" />
          {lookLabel && (
            <div className="interact-prompt">
              {IS_TOUCH ? (
                <button className="interact-btn" onClick={() => sceneRef.current?.tapInteract()}>
                  {lookLabel}
                </button>
              ) : (
                <span><kbd>E</kbd> {lookLabel}</span>
              )}
            </div>
          )}
        </>
      )}

      {IS_TOUCH && showHud && (
        <div className="joystick-base" ref={joystickRef}>
          <div className="joystick-knob" ref={knobRef} />
        </div>
      )}

      {showOverlay && (
        <div className="enter-overlay" onClick={handleEnter}>
          <div className="enter-box">
            {!everActivated && <p className="enter-eyebrow">Somewhere in the woods</p>}
            <p className="enter-title">{everActivated ? 'Paused' : 'Ghayas Sher'}</p>
            <p className="enter-hint">
              {IS_TOUCH
                ? 'Drag to look around · joystick to walk · tap a prompt to inspect'
                : 'WASD to move · mouse to look · scroll to zoom · E to inspect'}
            </p>
            <button className="enter-btn" onClick={handleEnter}>
              {everActivated ? 'Resume' : 'Enter the Cabin'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
