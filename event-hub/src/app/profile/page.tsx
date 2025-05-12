'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Image from 'next/image'
import Cropper from 'react-easy-crop'
import Slider from '@mui/material/Slider'
import Dialog from '@mui/material/Dialog'
import getCroppedImg from '../../utils/cropImage'

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', student_id: '', phone: '', school: '' })
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [showCropper, setShowCropper] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  
  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {setCroppedAreaPixels(croppedAreaPixels)}, [])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)
  }
  
  const showCroppedImage = async () => {
    try {
      const base64 = await getCroppedImg(imageSrc!, croppedAreaPixels)
      setAvatar(base64)
      setShowCropper(false)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/auth/login')
        return
      }

      setUserId(user.id)
      setEmail(user.email ?? null)

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single()

      if (data) {
        setForm({
          name: data.name ?? '',
          student_id: data.student_id ?? '',
          phone: data.phone ?? '',
          school: data.school ?? '',
        })
        setAvatar(data.avatar ?? null)
      }
    }

    fetchProfile()
  }, [router])


  const handleSave = async () => {
    if (!userId) {
      setMessage('⚠️ 尚未取得使用者 ID')
      setIsError(true)
      return
    }

    const { error } = await supabase
      .from('users')
      .update({ ...form, avatar })
      .eq('email', email)

    if (error) {
      setMessage(`❌ 更新失敗：${error.message}`)
      setIsError(true)
    } else {
      setMessage('✅ 資料已成功更新！')
      setIsError(false)
      setTimeout(() => router.back(), 1000)
    }
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4 text-black dark:text-white">
      <h1 className="text-2xl font-bold mb-4">🧑 我的個人資料</h1>
      {email && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Email：{email}
        </p>
      )}

      {/* 頭像預覽 + 上傳 */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="w-24 h-24 rounded-full mx-auto border cursor-pointer overflow-hidden group relative"
      >
        {avatar ? (
          <Image
            src={avatar}
            alt="頭像預覽"
            width={96}
            height={96}
            unoptimized
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm text-gray-500">
            點我上傳
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
          更換頭像
        </div>
      </div>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageChange}
        className="hidden"
      />

      {/* 表單欄位 */}
      {['name', 'student_id', 'phone', 'school'].map((field) => (
        <label key={field} className="block mb-4">
          {field === 'name'
            ? '姓名'
            : field === 'student_id'
            ? '學號'
            : field === 'phone'
            ? '電話'
            : '就讀學校'}
          <input
            type="text"
            className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            value={(form as any)[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          />
        </label>
      ))}

      <button
        onClick={handleSave}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
      >
        💾 儲存變更
      </button>

      <button
        onClick={() => router.back()}
        className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 mt-4 transition-colors"
      >
        🔙 返回
      </button>

      {message && (
        <p className={`text-sm text-center mt-4 ${isError ? 'text-red-500' : 'text-green-500'}`}>
          {message}
        </p>
      )}

      <Dialog open={showCropper} onClose={() => setShowCropper(false)} maxWidth="sm" fullWidth>
        <div className="p-4">
          <div className="relative w-full h-80 bg-gray-100 dark:bg-gray-700 rounded">
            <Cropper
              image={imageSrc!}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="my-4">
            <Slider value={zoom} min={1} max={3} step={0.1} onChange={(_, value) => setZoom(value as number)} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCropper(false)} className="text-sm text-gray-500">取消</button>
            <button onClick={showCroppedImage} className="bg-blue-600 text-white px-3 py-1 rounded">確定裁切</button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
