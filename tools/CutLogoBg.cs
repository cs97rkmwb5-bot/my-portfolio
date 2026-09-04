using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public static class CutLogoBg
{
    const int PaperR = 248;
    const int PaperG = 248;
    const int PaperB = 246;

    public static void Process(string srcPath, string dstPath)
    {
        using (var src = (Bitmap)Image.FromFile(srcPath))
        {
            int w = src.Width;
            int h = src.Height;
            var keyed = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            using (var g = Graphics.FromImage(keyed))
            {
                g.Clear(Color.Transparent);
                g.DrawImage(src, 0, 0, w, h);
            }

            var rect = new Rectangle(0, 0, w, h);
            var data = keyed.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int stride = data.Stride;
            int bytes = Math.Abs(stride) * h;
            var buf = new byte[bytes];
            System.Runtime.InteropServices.Marshal.Copy(data.Scan0, buf, 0, bytes);

            for (int y = 0; y < h; y++)
            {
                int row = y * stride;
                for (int x = 0; x < w; x++)
                {
                    int i = row + x * 4;
                    byte b = buf[i];
                    byte gch = buf[i + 1];
                    byte r = buf[i + 2];
                    int min = Math.Min(r, Math.Min(gch, b));
                    int max = Math.Max(r, Math.Max(gch, b));
                    int chroma = max - min;
                    int dist = Dist(r, gch, b, PaperR, PaperG, PaperB);

                    byte a;
                    if (chroma < 14 && min >= 236 && dist <= 22)
                    {
                        a = 0;
                    }
                    else if (chroma < 16 && min >= 228 && dist <= 34)
                    {
                        a = (byte)Math.Max(0, Math.Min(255, (dist - 18) * 16));
                    }
                    else
                    {
                        a = 255;
                    }
                    buf[i + 3] = a;
                }
            }

            int minX = w, minY = h, maxX = 0, maxY = 0;
            bool any = false;
            for (int y = 0; y < h; y++)
            {
                int row = y * stride;
                for (int x = 0; x < w; x++)
                {
                    if (buf[row + x * 4 + 3] < 24) continue;
                    any = true;
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }

            System.Runtime.InteropServices.Marshal.Copy(buf, 0, data.Scan0, bytes);
            keyed.UnlockBits(data);

            if (!any)
            {
                keyed.Dispose();
                throw new Exception("No foreground in " + srcPath);
            }

            int pad = Math.Max(10, (int)(Math.Max(maxX - minX + 1, maxY - minY + 1) * 0.04));
            minX = Math.Max(0, minX - pad);
            minY = Math.Max(0, minY - pad);
            maxX = Math.Min(w - 1, maxX + pad);
            maxY = Math.Min(h - 1, maxY + pad);
            int cw = maxX - minX + 1;
            int ch = maxY - minY + 1;

            using (var cropped = keyed.Clone(new Rectangle(minX, minY, cw, ch), PixelFormat.Format32bppArgb))
            using (var flat = new Bitmap(cw, ch, PixelFormat.Format32bppArgb))
            using (var gg = Graphics.FromImage(flat))
            {
                gg.Clear(Color.FromArgb(255, PaperR, PaperG, PaperB));
                gg.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceOver;
                gg.DrawImage(cropped, 0, 0, cw, ch);
                Directory.CreateDirectory(Path.GetDirectoryName(dstPath));
                flat.Save(dstPath, ImageFormat.Png);
            }
            keyed.Dispose();
        }
    }

    static int Dist(int r, int g, int b, int r2, int g2, int b2)
    {
        int dr = r - r2, dg = g - g2, db = b - b2;
        return (int)Math.Sqrt(dr * dr + dg * dg + db * db);
    }
}
