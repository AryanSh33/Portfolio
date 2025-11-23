"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useMotionTemplate,
  AnimatePresence,
} from "framer-motion"
import { Github, Mail, Linkedin, ChevronDown, ArrowRight, X, Code2, Database, GitBranch } from "lucide-react"

// --- Components ---

function Magnetic({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouse = (e: React.MouseEvent) => {
    const { clientX, clientY } = e
    const { height, width, left, top } = ref.current!.getBoundingClientRect()
    const middleX = clientX - (left + width / 2)
    const middleY = clientY - (top + height / 2)
    setPosition({ x: middleX * 0.1, y: middleY * 0.1 })
  }

  const reset = () => {
    setPosition({ x: 0, y: 0 })
  }

  const { x, y } = position
  return (
    <motion.div
      style={{ position: "relative" }}
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x, y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
    >
      {children}
    </motion.div>
  )
}

function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, window.innerHeight || 800], [1, 0])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let particles: Particle[] = []
    let hue = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      baseX: number
      baseY: number
      density: number
      color: string
      angle: number

      constructor(x: number, y: number) {
        this.x = x
        this.y = y
        this.baseX = x
        this.baseY = y
        this.size = Math.random() * 3 + 1
        this.speedX = Math.random() * 0.5 - 0.25
        this.speedY = Math.random() * 0.5 - 0.25
        this.density = Math.random() * 15 + 1
        this.angle = Math.random() * 360
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`
      }

      draw() {
        if (!ctx) return
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
      }

      update(mouse: { x: number; y: number }) {
        const dx = mouse.x - this.x
        const dy = mouse.y - this.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const forceDirectionX = dx / distance
        const forceDirectionY = dy / distance
        const maxDistance = 200 // Increased interaction radius
        const force = (maxDistance - distance) / maxDistance

        const angle = Math.atan2(dy, dx)
        const spin = 0.5

        if (distance < maxDistance) {
          this.x -= forceDirectionX * force * this.density * 0.8 + Math.sin(angle) * spin
          this.y -= forceDirectionY * force * this.density * 0.8 + Math.cos(angle) * spin
        } else {
          if (this.x !== this.baseX) {
            const dx = this.x - this.baseX
            this.x -= dx / 40
          }
          if (this.y !== this.baseY) {
            const dy = this.y - this.baseY
            this.y -= dy / 40
          }
        }
      }
    }

    const initParticles = () => {
      particles = []
      const numberOfParticles = (canvas.width * canvas.height) / 8000
      for (let i = 0; i < numberOfParticles; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        particles.push(new Particle(x, y))
      }
    }

    const animate = () => {
      if (!ctx) return
      ctx.fillStyle = "rgba(3, 0, 20, 0.1)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      hue += 0.5

      particles.forEach((particle) => {
        particle.draw()
        particle.update(mousePosition)
      })

      connect()
      animationFrameId = requestAnimationFrame(animate)
    }

    const connect = () => {
      if (!ctx) return
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x
          const dy = particles[a].y - particles[b].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 100) {
            const opacityValue = 1 - distance / 100
            ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${opacityValue * 0.5})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particles[a].x, particles[a].y)
            ctx.lineTo(particles[b].x, particles[b].y)
            ctx.stroke()
          }
        }
      }
    }

    window.addEventListener("resize", resize)
    resize()
    animate()

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.x, y: e.y })
    }
    window.addEventListener("mousemove", handleMouseMove)
    const handleClick = () => {
      particles.forEach((p) => {
        p.x += (Math.random() - 0.5) * 100
        p.y += (Math.random() - 0.5) * 100
      })
    }
    window.addEventListener("click", handleClick)

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("click", handleClick)
      cancelAnimationFrame(animationFrameId)
    }
  }, [mousePosition])

  return (
    <motion.div style={{ opacity }} className="fixed inset-0 z-0 pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full bg-[#030014]" />
    </motion.div>
  )
}

function CrewMateFollower() {
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 })
  const [crewPosition, setCrewPosition] = useState({ x: -100, y: -100 })
  const [isMoving, setIsMoving] = useState(false)
  const animationFrameRef = useRef<number | null>(null)
  const lastUpdateTime = useRef(Date.now())
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastDirectionRef = useRef<"left" | "right" | "up" | "down">("right")

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", updateMousePosition)
    return () => window.removeEventListener("mousemove", updateMousePosition)
  }, [])

  useEffect(() => {
    const animate = () => {
      const now = Date.now()
      const deltaTime = (now - lastUpdateTime.current) / 1000
      lastUpdateTime.current = now

      const dx = mousePosition.x - crewPosition.x
      const dy = mousePosition.y - crewPosition.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Threshold to stop moving
      if (distance < 5) {
        setIsMoving(false)
        // Resume after 3 seconds
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)
        pauseTimerRef.current = setTimeout(() => {
          setIsMoving(true)
        }, 3000)
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      setIsMoving(true)

      // Determine primary direction
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      if (absDx > absDy) {
        lastDirectionRef.current = dx > 0 ? "right" : "left"
      } else {
        lastDirectionRef.current = dy > 0 ? "down" : "up"
      }

      // Move towards cursor with smooth but intentional speed
      const speed = 120 // pixels per second (reduced from cursor speed)
      const moveDistance = Math.min(speed * deltaTime, distance)
      const ratio = moveDistance / distance

      setCrewPosition({
        x: crewPosition.x + dx * ratio,
        y: crewPosition.y + dy * ratio,
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current)
      }
    }
  }, [mousePosition, crewPosition])

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-50 will-change-transform"
      style={{
        x: crewPosition.x - 20,
        y: crewPosition.y - 20,
      }}
    >
      <motion.div
        animate={{
          scaleX: (lastDirectionRef.current === "right" ? -1 : 1),
          y: isMoving ? [0, -4, 0, -4, 0] : 0,
        }}
        transition={{
          y: {
            duration: 0.4,
            repeat: isMoving ? Number.POSITIVE_INFINITY : 0,
            ease: "linear",
          },
          scaleX: {
            duration: 0.1,
          },
        }}
        style={{
          width: 40,
          height: 40,
          imageRendering: "pixelated",
        }}
      >
        <img
          src={isMoving ? "/among-us-red.gif" : "/among us red.png"}
          alt="Among Us Crew Member"
          className="w-full h-full object-contain"
          style={{
            imageRendering: "pixelated",
            filter: "drop-shadow(2px 2px 0 rgba(0,0,0,0.3))",
            transform: !isMoving ? "scaleX(-1)" : "scaleX(1)",
          }}
        />
      </motion.div>
    </motion.div>
  )
}

function GlitchText({ text }: { text: string }) {
  return (
    <div className="relative inline-block group">
      <span className="relative z-10">{text}</span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-red-500 opacity-0 group-hover:opacity-70 group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all duration-100 select-none">
        {text}
      </span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-blue-500 opacity-0 group-hover:opacity-70 group-hover:-translate-x-[2px] group-hover:-translate-y-[2px] transition-all duration-100 select-none">
        {text}
      </span>
    </div>
  )
}

function ProjectDetailModal({ project, onClose }: { project: any; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-gray-900/95 backdrop-blur-xl"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8 md:p-12">
          <div className="mb-8">
            <div className="h-64 md:h-96 w-full overflow-hidden rounded-xl bg-black/50 mb-6">
              <img
                src={project.image || "/placeholder.svg"}
                alt={project.title}
                className="w-full h-full object-cover"
              />
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{project.title}</h2>
            <p className="text-xl text-gray-400 mb-6">{project.description}</p>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-4">Tech Stack</h3>
            <div className="flex flex-wrap gap-3">
              {project.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-4 py-2 text-sm rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-4">Key Features</h3>
            <ul className="space-y-3">
              {project.features.map((feature: string, index: number) => (
                <li key={index} className="flex items-start gap-3 text-gray-300">
                  <ArrowRight className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {project.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {project.metrics.map((metric: any, index: number) => (
                <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-purple-400 mb-1">{metric.value}</div>
                  <div className="text-sm text-gray-400">{metric.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-4">
            <Magnetic>
              <button
                onClick={() => window.open("https://github.com/aryansharma", "_blank")}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-purple-400 transition-colors"
              >
                <Github className="w-5 h-5" />
                View Code
              </button>
            </Magnetic>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ProjectCard({ project, index, onClick }: { project: any; index: number; onClick: () => void }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-100, 100], [30, -30])
  const rotateY = useTransform(x, [-100, 100], [-30, 30])

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect()
    const xPct = (clientX - left) / width - 0.5
    const yPct = (clientY - top) / height - 0.5
    x.set(xPct * 200)
    y.set(yPct * 200)

    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.2 }}
      style={{ x, y, rotateX, rotateY, z: 100 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
      onClick={onClick}
      className="relative w-full h-full perspective-1000 group cursor-pointer"
    >
      <div className="relative h-full w-full rounded-xl border border-white/10 bg-gray-900/50 p-8 backdrop-blur-sm transition-all duration-300 overflow-hidden group-active:scale-95">
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                800px circle at ${mouseX}px ${mouseY}px,
                rgba(255, 255, 255, 0.1),
                transparent 80%
              )
            `,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative z-10 flex flex-col h-full">
          <div className="mb-4 h-48 w-full overflow-hidden rounded-lg bg-black/50 perspective-500">
            <img
              src={project.image || "/placeholder.svg"}
              alt={project.title}
              className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-all duration-500"
            />
          </div>

          <h3 className="text-2xl font-bold text-white mb-2 transition-colors">{project.title}</h3>
          <p className="text-gray-400 mb-4 flex-grow line-clamp-2">{project.description}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {project.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs rounded-full bg-white/5 text-white/70 border border-white/10"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="px-3 py-1 text-xs rounded-full bg-white/5 text-white/70 border border-white/10">
                +{project.tags.length - 3}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors">
              Click to Explore
            </div>
            <div className="flex gap-4">
              <div onClick={(e) => e.stopPropagation()}>
                <Magnetic>
                  <Github className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                </Magnetic>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// --- Main Page ---

export default function Portfolio() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  const [selectedProject, setSelectedProject] = useState<any>(null)

  const handleProjectClick = (project: any) => {
    setSelectedProject(project)
  }

  const projects = [
    {
      title: "LLM & QGNN-driven Cyber Threat Intelligence Platform",
      description:
        "Engineered an AI cybersecurity framework using Quantized Graph Neural Networks (QGNNs) for real-time anomaly detection with dynamic attack graph construction.",
      tags: ["PyTorch", "Hugging Face", "Kafka", "FastAPI", "PyGeometric", "PennyLane"],
      image: "/cybersecurity-ai-network-graph-dashboard.jpg",
      features: [
        "Real-time anomaly detection using Quantized Graph Neural Networks (QGNNs)",
        "Dynamic attack graph construction for threat visualization",
        "Prompt-tuned LLMs for threat explanations and recommendations",
        "Scalable microservices architecture with Kafka for event streaming",
        "Integration with multiple threat intelligence feeds",
      ],
      metrics: [
        { label: "Detection Speed", value: "<100ms" },
        { label: "Accuracy", value: "94%" },
        { label: "Threats/Day", value: "10K+" },
      ],
    },
    {
      title: "ResearchLM – AI-powered Research Assistant",
      description:
        "Built a FastAPI-based system enabling natural language querying of research papers with BERT-powered semantic search and Gemini summarization.",
      tags: ["FastAPI", "Gemini", "Semantic Scholar API", "BERT", "Python"],
      image: "/research-papers-ai-assistant-dashboard.jpg",
      features: [
        "Natural language querying of academic research papers",
        "BERT-based semantic keyphrase extraction for accurate search",
        "Gemini-powered summarization of complex research content",
        "Integration with Semantic Scholar API for access to 200M+ papers",
        "Real-time citation graph analysis",
      ],
      metrics: [
        { label: "Papers Indexed", value: "50K+" },
        { label: "Query Speed", value: "<2s" },
        { label: "Accuracy", value: "91%" },
      ],
    },
    {
      title: "Brain Tumor Segmentation – Hybrid CNN-Transformer",
      description:
        "Developed a Swin-UNet hybrid model for brain tumor segmentation achieving 97% accuracy with Dice score of 0.94 and HD95 of 1.",
      tags: ["PyTorch", "OpenCV", "Grad-CAM", "Nibabel", "FastAPI"],
      image: "/brain-scan-medical-ai-segmentation.jpg",
      features: [
        "Swin-UNet hybrid architecture combining CNN and Transformer strengths",
        "Advanced preprocessing pipeline for MRI scans",
        "Grad-CAM visualization for model interpretability",
        "FastAPI deployment for clinical integration",
        "Support for multiple tumor types and stages",
      ],
      metrics: [
        { label: "Accuracy", value: "97%" },
        { label: "Dice Score", value: "0.94" },
        { label: "HD95", value: "1.0" },
      ],
    },
  ]

  return (
    <div className="relative min-h-screen bg-[#030014] text-white overflow-x-hidden selection:bg-purple-500/30">
      <InteractiveBackground />
      <CrewMateFollower />

      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 origin-left z-50"
        style={{ scaleX }}
      />

      <nav className="fixed top-0 w-full z-40 px-6 py-6 flex justify-between items-center backdrop-blur-sm border-b border-white/5">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl font-bold tracking-tighter"
        >
          ARYAN SHARMA
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:flex gap-8 text-sm font-medium text-gray-400"
        >
          {["Home", "About", "Projects", "Skills", "Contact"].map((item) => (
            <Magnetic key={item}>
              <a
                href={`#${item.toLowerCase()}`}
                className="hover:text-white transition-colors relative group block px-2 py-1"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-500 transition-all group-hover:w-full" />
              </a>
            </Magnetic>
          ))}
        </motion.div>
      </nav>

      <section id="home" className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center z-10"
        >
          <h2 className="text-purple-500 font-mono mb-4 tracking-widest">AI/ML ENGINEER & WEB DEVELOPER</h2>
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-6 mix-blend-overlay">
            <GlitchText text="WEB" />
            <br />
            <GlitchText text="DEVELOPER" />
          </h1>
          <p className="max-w-2xl mx-auto text-gray-400 text-lg md:text-xl mb-10 leading-relaxed">
            Building AI-powered solutions at the intersection of{" "}
            <span className="text-white font-bold">machine learning</span>,{" "}
            <span className="text-white font-bold">data science</span>, and{" "}
            <span className="text-white font-bold">full-stack development</span>.
          </p>

          <div className="flex gap-6 justify-center">
            <Magnetic>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })}
                className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-purple-400 transition-colors"
              >
                View Projects
              </motion.button>
            </Magnetic>
            <Magnetic>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                className="px-8 py-4 border border-white/20 rounded-full hover:bg-white/10 transition-colors backdrop-blur-sm"
              >
                Contact Me
              </motion.button>
            </Magnetic>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-500"
        >
          <ChevronDown className="w-8 h-8" />
        </motion.div>
      </section>

      <section id="projects" className="relative py-32 px-4 z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} className="mb-20">
            <h2 className="text-5xl md:text-7xl font-bold mb-6">Featured Projects</h2>
            <div className="h-1 w-20 bg-purple-500" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
            {projects.map((project, index) => (
              <ProjectCard key={index} project={project} index={index} onClick={() => handleProjectClick(project)} />
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selectedProject && <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
      </AnimatePresence>

      <section id="skills" className="relative py-32 px-4 z-10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} className="mb-20">
            <h2 className="text-5xl md:text-7xl font-bold mb-6">Technical Arsenal</h2>
            <div className="h-1 w-20 bg-purple-500" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {[
              {
                icon: Code2,
                title: "Languages",
                skills: ["Java", "Python", "C", "JavaScript", "SQL"],
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: Database,
                title: "Frameworks & Technologies",
                skills: ["FastAPI", "Flask", "TensorFlow", "PyTorch", "Scikit-learn", "OpenCV"],
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: Database,
                title: "Databases & Tools",
                skills: ["PostgreSQL", "SQLite", "Power BI", "Excel"],
                color: "from-green-500 to-emerald-500",
              },
              {
                icon: GitBranch,
                title: "Version Control",
                skills: ["Git", "GitHub", "Docker"],
                color: "from-orange-500 to-red-500",
              },
            ].map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300"
              >
                <div
                  className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-1 transition-opacity duration-500 rounded-2xl"
                  style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
                />

                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${category.color} mb-6`}>
                  <category.icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-4">{category.title}</h3>

                <div className="space-y-2">
                  {category.skills.map((skill, skillIndex) => (
                    <motion.div
                      key={skillIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + skillIndex * 0.05 }}
                      className="flex items-center gap-2 text-gray-300"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      <span>{skill}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="relative p-12 rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 backdrop-blur-sm overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5" />

            <div className="relative z-10 text-center">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 mb-6"
              >
                <Code2 className="w-12 h-12 text-white" />
              </motion.div>

              <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">
                750+{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500">
                  LeetCode
                </span>{" "}
                Problems Solved
              </h3>

              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Mastering data structures, algorithms, and problem-solving through consistent practice and optimization
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="about" className="relative py-32 px-4 z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-4xl md:text-6xl font-bold mb-12"
          >
            About The{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500">
              Innovator
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-400 leading-relaxed mb-12"
          >
            I'm Aryan Sharma, an AI/ML engineer and full-stack developer passionate about building intelligent systems.
            Specializing in deep learning, data science, and scalable web applications, I create solutions that bridge
            the gap between cutting-edge research and real-world impact.
          </motion.p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {[
              { label: "AI Projects", value: "15+" },
              { label: "LeetCode", value: "750+" },
              { label: "Tech Stack", value: "20+" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ delay: index * 0.1, type: "spring" }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-colors"
              >
                <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="relative py-32 px-4 z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl font-bold mb-8">
                Let's Build <br />
                Something <span className="text-purple-500">Revolutionary</span>
              </h2>
              <p className="text-gray-400 text-lg mb-12">
                Ready to collaborate on AI/ML projects or full-stack development? Let's create intelligent solutions
                that make a real impact.
              </p>

              <div className="flex gap-6">
                {[Github, Linkedin, Mail].map((Icon, index) => (
                  <Magnetic key={index}>
                    <motion.a
                      href="#"
                      whileHover={{ y: -5, color: "#a855f7" }}
                      className="p-4 rounded-full bg-white/5 border border-white/10 text-white transition-colors block"
                    >
                      <Icon className="w-6 h-6" />
                    </motion.a>
                  </Magnetic>
                ))}
              </div>
            </div>

            <motion.form initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-sm font-medium text-gray-400 group-focus-within:text-purple-500 transition-colors">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full px-6 py-4 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-white"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2 group">
                <label className="text-sm font-medium text-gray-400 group-focus-within:text-purple-500 transition-colors">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-6 py-4 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-white"
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2 group">
                <label className="text-sm font-medium text-gray-400 group-focus-within:text-purple-500 transition-colors">
                  Message
                </label>
                <textarea
                  rows={4}
                  className="w-full px-6 py-4 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-white"
                  placeholder="Tell me about your project..."
                />
              </div>
              <Magnetic>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  Send Message
                </motion.button>
              </Magnetic>
            </motion.form>
          </div>
        </div>
      </section>

      <footer className="relative py-8 text-center text-gray-500 text-sm z-10 border-t border-white/5">
        <p>© 2025 Aryan Sharma. All rights reserved.</p>
      </footer>
    </div>
  )
}
