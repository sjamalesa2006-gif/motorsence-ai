import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type MotorModelProps = {
  className?: string
}

export default function MotorModel({ className }: MotorModelProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(5.3, 3.2, 7.4)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    host.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0xdcecff, 0x11151e, 2))
    const keyLight = new THREE.DirectionalLight(0xd9e9ff, 3.2)
    keyLight.position.set(3, 5, 5)
    scene.add(keyLight)
    const rimLight = new THREE.PointLight(0x55a8ff, 32, 12)
    rimLight.position.set(-3, 1, -2)
    scene.add(rimLight)

    const motor = new THREE.Group()
    scene.add(motor)
    const metal = new THREE.MeshStandardMaterial({ color: 0x778493, metalness: 0.82, roughness: 0.3 })
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x333c48, metalness: 0.8, roughness: 0.38 })
    const accent = new THREE.MeshStandardMaterial({ color: 0x5c8fbd, metalness: 0.7, roughness: 0.28 })
    const finGeometry = new THREE.CylinderGeometry(1.05, 1.05, 0.075, 48, 1, true)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.7, 48), metal)
    body.rotation.z = Math.PI / 2
    motor.add(body)

    for (let i = 0; i < 13; i += 1) {
      const fin = new THREE.Mesh(finGeometry, darkMetal)
      fin.rotation.z = Math.PI / 2
      fin.position.x = -1.18 + i * 0.195
      motor.add(fin)
    }

    const endCap = new THREE.Mesh(new THREE.CylinderGeometry(1.04, 1.04, 0.22, 48), darkMetal)
    endCap.rotation.z = Math.PI / 2
    endCap.position.x = 1.42
    motor.add(endCap)
    const fanCover = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.86, 0.42, 32), darkMetal)
    fanCover.rotation.z = Math.PI / 2
    fanCover.position.x = -1.47
    motor.add(fanCover)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.88, 24), accent)
    shaft.rotation.z = Math.PI / 2
    shaft.position.x = 2.02
    motor.add(shaft)
    const shaftEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 24), metal)
    shaftEnd.rotation.z = Math.PI / 2
    shaftEnd.position.x = 2.45
    motor.add(shaftEnd)
    const terminalBox = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.5, 0.8), darkMetal)
    terminalBox.position.set(-0.15, 1.12, 0)
    motor.add(terminalBox)
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.66), metal)
    lid.position.set(-0.15, 1.42, 0)
    motor.add(lid)

    for (const x of [-0.9, 0.95]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.18, 1.15), darkMetal)
      foot.position.set(x, -1.02, 0)
      motor.add(foot)
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.25, 0.72), metal)
      post.position.set(x, -0.9, 0)
      motor.add(post)
    }

    const rings = new THREE.Group()
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x62afff, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    for (const radius of [1.23, 1.32]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.009, 8, 96), ringMaterial)
      ring.rotation.y = Math.PI / 2
      ring.position.x = 0.12
      rings.add(ring)
    }
    motor.add(rings)
    motor.rotation.z = -0.12
    motor.scale.setScalar(0.88)

    const resize = () => {
      const { width, height } = host.getBoundingClientRect()
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    const pointer = { x: 0, y: 0 }
    const onPointerMove = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect()
      pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.16
      pointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.1
    }
    host.addEventListener('pointermove', onPointerMove)
    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      motor.rotation.y += ((pointer.x) - motor.rotation.y) * 0.018
      motor.rotation.x += ((-0.12 + pointer.y) - motor.rotation.x) * 0.018
      rings.rotation.x = Math.sin(performance.now() * 0.00035) * 0.025
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      host.removeEventListener('pointermove', onPointerMove)
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material.dispose())
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div className={className} ref={hostRef} aria-label="Interactive 3D industrial motor model" role="img" />
}
