using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public static class StripPropBg
{
    static bool IsBlack(byte r, byte g, byte b)
    {
        return r < 22 && g < 22 && b < 22;
    }

    static int Luma(byte r, byte g, byte b)
    {
        return (r * 299 + g * 587 + b * 114) / 1000;
    }

    static int Chroma(byte r, byte g, byte b)
    {
        int max = Math.Max(r, Math.Max(g, b));
        int min = Math.Min(r, Math.Min(g, b));
        return max - min;
    }

    static bool IsCaption(byte r, byte g, byte b)
    {
        int c = Chroma(r, g, b);
        int y = Luma(r, g, b);
        return c < 28 && y >= 72 && y <= 188;
    }

    static bool IsSprite(byte r, byte g, byte b)
    {
        if (IsBlack(r, g, b)) return false;
        if (IsCaption(r, g, b)) return false;
        return true;
    }

    public static void Process(string srcPath, string dstPath)
    {
        string tmp = dstPath + ".tmp.png";
        using (var loaded = Image.FromFile(srcPath))
        using (var src = new Bitmap(loaded.Width, loaded.Height, PixelFormat.Format32bppArgb))
        {
            using (var copy = Graphics.FromImage(src))
            {
                copy.Clear(Color.Transparent);
                copy.DrawImage(loaded, 0, 0, loaded.Width, loaded.Height);
            }

            int w = src.Width;
            int h = src.Height;
            var rect = new Rectangle(0, 0, w, h);
            var data = src.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int stride = data.Stride;
            int bytes = Math.Abs(stride) * h;
            var buf = new byte[bytes];
            System.Runtime.InteropServices.Marshal.Copy(data.Scan0, buf, 0, bytes);

            var seed = new bool[w * h];
            int seedCount = 0;
            for (int y = 0; y < h; y++)
            {
                int row = y * stride;
                for (int x = 0; x < w; x++)
                {
                    int i = row + x * 4;
                    byte b = buf[i];
                    byte g = buf[i + 1];
                    byte r = buf[i + 2];
                    if (IsBlack(r, g, b)) continue;
                    if (Chroma(r, g, b) >= 16)
                    {
                        seed[y * w + x] = true;
                        seedCount++;
                    }
                }
            }

            int dilate = Math.Max(8, Math.Min(w, h) / 48);
            var keep = new bool[w * h];
            if (seedCount == 0)
            {
                for (int y = 0; y < h; y++)
                {
                    int row = y * stride;
                    for (int x = 0; x < w; x++)
                    {
                        int i = row + x * 4;
                        byte b = buf[i], gch = buf[i + 1], r = buf[i + 2];
                        keep[y * w + x] = !IsBlack(r, gch, b) && !IsCaption(r, gch, b);
                    }
                }
            }
            else
            {
                for (int y = 0; y < h; y++)
                {
                    for (int x = 0; x < w; x++)
                    {
                        if (!seed[y * w + x]) continue;
                        int y0 = Math.Max(0, y - dilate);
                        int y1 = Math.Min(h - 1, y + dilate);
                        int x0 = Math.Max(0, x - dilate);
                        int x1 = Math.Min(w - 1, x + dilate);
                        for (int yy = y0; yy <= y1; yy++)
                        {
                            for (int xx = x0; xx <= x1; xx++)
                            {
                                int dx = xx - x;
                                int dy = yy - y;
                                if (dx * dx + dy * dy <= dilate * dilate)
                                    keep[yy * w + xx] = true;
                            }
                        }
                    }
                }
            }

            int minX = w, minY = h, maxX = 0, maxY = 0;
            bool any = false;
            for (int y = 0; y < h; y++)
            {
                int row = y * stride;
                for (int x = 0; x < w; x++)
                {
                    int i = row + x * 4;
                    byte b = buf[i];
                    byte g = buf[i + 1];
                    byte r = buf[i + 2];
                    bool keepPx = keep[y * w + x] && !IsBlack(r, g, b);
                    if (!keepPx)
                    {
                        buf[i + 3] = 0;
                        continue;
                    }
                    buf[i + 3] = 255;
                    any = true;
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }

            System.Runtime.InteropServices.Marshal.Copy(buf, 0, data.Scan0, bytes);
            src.UnlockBits(data);

            if (!any)
            {
                src.Save(tmp, ImageFormat.Png);
            }
            else
            {
                int bw = maxX - minX + 1;
                int bh = maxY - minY + 1;
                int pad = Math.Max(8, (int)Math.Round(Math.Max(bw, bh) * 0.14));
                int side = Math.Max(bw, bh) + pad * 2;
                int cx = minX + bw / 2;
                int cy = minY + bh / 2;
                int left = cx - side / 2;
                int top = cy - side / 2;

                using (var square = new Bitmap(side, side, PixelFormat.Format32bppArgb))
                using (var gs = Graphics.FromImage(square))
                {
                    gs.Clear(Color.Transparent);
                    gs.DrawImage(src, -left, -top, w, h);
                    square.Save(tmp, ImageFormat.Png);
                }
            }
        }
        File.Copy(tmp, dstPath, true);
        File.Delete(tmp);
        Console.WriteLine("stripped " + Path.GetFileName(dstPath));
    }

    public static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.WriteLine("Usage: StripPropBg <srcDir> <dstDir>");
            return 1;
        }
        string srcDir = args[0];
        string dstDir = args[1];
        Directory.CreateDirectory(dstDir);
        string[] names = { "bottle.png", "celery.png", "grass.png", "rice.png", "peanut.png", "spoon.png", "mushroom.png", "sugar.png", "water.png", "soap.png" };
        foreach (var name in names)
        {
            Process(Path.Combine(srcDir, name), Path.Combine(dstDir, name));
        }
        return 0;
    }
}
