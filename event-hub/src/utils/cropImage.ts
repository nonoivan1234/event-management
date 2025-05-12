export default function getCroppedImg(
  imageSrc: string,
  pixelCrop: any,
  targetSize: number = 128 // ✅ 預設輸出壓縮尺寸 
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.src = imageSrc

    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = targetSize
      canvas.height = targetSize

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('無法取得 canvas context'))
        return
      }

      // ✅ 計算縮放比例
      const scaleX = canvas.width / pixelCrop.width
      const scaleY = canvas.height / pixelCrop.height

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        canvas.width,
        canvas.height
      )

      // ✅ 將 canvas 轉為 data:image/png;base64,...
      const base64Image = canvas.toDataURL('image/png', 0.8) // 可調壓縮率
      resolve(base64Image)
    }

    image.onerror = () => {
      reject(new Error('圖片載入失敗'))
    }
  })
}
