'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Cropper from 'react-easy-crop'
import Slider from '@mui/material/Slider'
import Dialog from '@mui/material/Dialog'
import getCroppedImg from '@/utils/cropImage'
import LoadingScreen from '@/components/loading'
import Spinner from '@/components/ui/Spinner'

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', student_id: '', phone: '', school: ''})
  const [password, setPassword] = useState('')
  const [lineBound, setLineBound] = useState(false)
  const [LINE_AUTH_URL, setLINE_AUTH_URL] = useState('')

  const [mainMessage, setMainMessage] = useState('')
  const [mainIsError, setMainIsError] = useState(false)

  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordIsError, setPasswordIsError] = useState(false)

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [showCropper, setShowCropper] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [loading, setLoading] = useState(true) // ✅ 加入 loading 狀態
  const [submitting, setSubmitting] = useState(false)
  const [unbinding, setUnbinding] = useState(false)
  const [showPopover, setShowPopover] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

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
    const LINE_CLIENT_ID = "2007493440"
    const REDIRECT_URI = window.location.origin + '/api/bind-line'
    setLINE_AUTH_URL(`https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=1234&scope=profile%20openid`)
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
        setLineBound(!!data.line_id) // 假設有 line_id 表示已綁定 LINE
      }
      setLoading(false) // ✅ 結束載入
    }

    fetchProfile()
  }, [router])

  useEffect(() => {
    if (!showPasswordModal) {
      setPassword('')
      setPasswordMessage('')
      setPasswordIsError(false)
    }
  }, [showPasswordModal])

  useEffect(() => {
    const isValidPhone = (val: string) => /^\d{9,10}$/.test(val);
    setShowPopover(form.phone !== '' && !isValidPhone(form.phone));
  }, [form.phone]);


  const handleSave = async () => {
    if(showPopover){
      setMainMessage('⚠️ 請輸入正確的電話格式')
      setMainIsError(true)
      return
    }
    if (!userId) {
      setMainMessage('⚠️ 尚未取得使用者 ID')
      setMainIsError(true)
      return
    }
    setSubmitting(true)
    const { error } = await supabase
      .from('users')
      .update({ ...form, avatar })
      .eq('email', email)

    if (error) {
      setMainMessage(`❌ 資料更新失敗：${error.message}`)
      setMainIsError(true)
    } else {
      setMainMessage('✅ 資料已成功更新！')
      setMainIsError(false)
    }
    setSubmitting(false)
  }

  const UnbindLine = async () => {
    if (!userId) 
      return setMainMessage('⚠️ 尚未取得使用者 ID')
    setLoading(unbinding)
    const { error } = await supabase.from('users').update({ line_id: null }).eq('user_id', userId)
    if (error) {
      setMainMessage(`❌ 取消綁定 LINE 失敗：${error.message}`)
      setMainIsError(true)
    } else {
      setMainMessage('✅ 已成功取消綁定 LINE 帳號')
      setMainIsError(false)
      setLineBound(false)
    }
    setUnbinding(false)
  }


  // ✅ Loading UI
  if (loading) return <LoadingScreen />

  return (
    <div className="max-w-md mx-auto py-10 px-4 text-black dark:text-white">
      <h1 className="text-2xl font-bold mb-4">🧑 我的個人資料</h1>
      {email && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Email：{email}
        </p>
      )}

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

      {['name', 'student_id', 'phone', 'school'].map((field) => (
        <div key={field} className="mb-4 relative">
          <label key={field} className="block mb-1">
            {field === 'name'
              ? '姓名'
              : field === 'student_id'
              ? '學號'
              : field === 'phone'
              ? '電話'
              : '就讀學校'}
            <input
              type={field === 'phone' ? 'tel' : 'text'}
              placeholder={`請輸入${field === 'name' ? '姓名' : field === 'student_id' ? '學號' : field === 'phone' ? '電話' : '就讀學校'}`}
              className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              {...field === 'phone' ? { pattern: '[0-9]*', inputMode: 'numeric'} : {}}
              value={(form as any)[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            />
            {field === "phone" && showPopover && (
              <div className="absolute z-10 mt-1 left-0 bg-red-500/90 dark:bg-red-700/90 text-white text-sm px-3 py-2 rounded shadow-md backdrop-blur-sm">
                請輸入正確的電話格式
                <div className="absolute top-[-6px] left-3 w-3 h-3 rotate-45 bg-red-500/90 dark:bg-red-700/90" />
              </div>
            )}
          </label>
        </div>
      ))}

      <button
        onClick={() => setShowPasswordModal(true)}
        className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 mt-2 mb-2 transition-colors"
      >
        🔐 更改密碼
      </button>
      <button
        onClick={() => {window.location.href = LINE_AUTH_URL}}
        className="mt-2 w-full py-2 rounded text-white transition-colors bg-green-600 hover:bg-green-700"
      >
        {lineBound ? '✅ 已綁定 LINE 帳號' : '📲 綁定 LINE 帳號'}
      </button>
      {lineBound && 
        <button
          onClick={() => UnbindLine()}
          disabled={unbinding}
          className="mt-2 w-full py-2 rounded text-white transition-colors bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed items-center justify-items-center"
        >
          {unbinding ? <Spinner className='w-6 h-6'/> : "取消綁定 LINE 帳號"}
        </button>
      }
      
      <hr className="my-4 border-gray-300 dark:border-gray-600" />

      <button
        onClick={handleSave}
        disabled={submitting}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed items-center justify-items-center"
      >
        {submitting ? <Spinner className='w-6 h-6'/> : "💾 儲存變更"}
      </button>

      <button
        onClick={() => router.back()}
        className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 mt-4 transition-colors"
      >
        🔙 返回
      </button>

      {mainMessage && (
        <p className={`text-sm text-center mt-4 ${mainIsError ? 'text-red-500' : 'text-green-500'}`}>
          {mainMessage}
        </p>
      )}

      {/* Cropper Modal */}
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

      {/* Password Modal */}
      <Dialog open={showPasswordModal} onClose={() => setShowPasswordModal(false)} maxWidth="xs" fullWidth>
        <div className="p-4 bg-white text-black dark:bg-gray-900 dark:text-white rounded">
          <h2 className="text-lg font-bold mb-4">更改密碼</h2>

          <input
            type="password"
            autoComplete="new-password"
            placeholder="輸入新密碼"
            className="w-full border border-gray-300 px-3 py-2 rounded 
                      focus:outline-none focus:ring-2 focus:ring-blue-500 
                      dark:bg-gray-800 dark:border-gray-600 dark:text-white 
                      dark:placeholder-gray-400 dark:focus:ring-blue-400 mb-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="text-sm px-3 py-1 rounded 
                        bg-gray-300 text-gray-700 
                        hover:bg-gray-400 hover:text-black 
                        dark:bg-gray-700 dark:text-gray-200 
                        dark:hover:bg-gray-600 dark:hover:text-white"
            >
              取消
            </button>
            <button
              onClick={async () => {
                if (!password) {
                  setPasswordMessage("⚠️ 請輸入新密碼")
                  setPasswordIsError(true)
                  return
                }
                const { error: chpswd } = await supabase.auth.updateUser({ password })
                if (chpswd) {
                  setPasswordMessage(`❌ 密碼更新失敗：${chpswd.message.includes('New password should be different from the old password.')? '新密碼不能與舊密碼相同' : chpswd.message}`)
                  setPasswordIsError(true)
                } else {
                  setPasswordMessage('✅ 密碼更新成功！')
                  setPasswordIsError(false)
                }
              }}
              className="px-3 py-1 rounded text-sm 
                        bg-blue-600 text-white 
                        hover:bg-blue-700 
                        dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              確認修改
            </button>
          </div>

          {passwordMessage && (
            <p className={`mt-4 text-sm text-center ${passwordIsError ? 'text-red-500' : 'text-green-500'}`}>
              {passwordMessage}
            </p>
          )}
        </div>
      </Dialog>
    </div>
  )
}
