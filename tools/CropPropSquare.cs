using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public static class CropPropSquare
{
    public static void Process(string srcPath, string dstPath, int outSize)
    {
        string tmp = dstPath + ".tmp.png";
        using (var loaded = Image.FromFile(srcPath))
        using (var src = new Bitmap(loaded.Width, loaded.Height, PixelFormat.Format32bppArgb))
        {
            using (var copy = Graphics.FromImage(src)) copy.DrawImage(loaded, 0, 0, loaded.Width, loaded.Height);
            int w = src.Width;
            int h = src.Height;
            var rect = new Rectangle(0, 0, w, h);
            var data = src.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            int stride = data.Stride;
            int bytes = Math.Abs(stride) * h;
            var buf = new byte[bytes];
            System.Runtime.InteropServices.Marshal.Copy(data.Scan0, buf, 0, bytes);
            src.UnlockBits(data);

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
                    if (r < 18 && g < 18 && b < 18) continue;
                    any = true;
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
            if (!any)
            {
                File.Copy(srcPath, dstPath, true);
                return;
            }

            int bw = maxX - minX + 1;
            int bh = maxY - minY + 1;
            int pad = Math.Max(18, (int)Math.Round(Math.Max(bw, bh) * 0.18));
            int side = Math.Max(bw, bh) + pad * 2;
            int cx = minX + bw / 2;
            int cy = minY + bh / 2;
            int left = cx - side / 2;
            int top = cy - side / 2;

            using (var square = new Bitmap(side, side, PixelFormat.Format32bppArgb))
            using (var gs = Graphics.FromImage(square))
            using (var dst = new Bitmap(outSize, outSize, PixelFormat.Format32bppArgb))
            using (var g = Graphics.FromImage(dst))
            {
                gs.Clear(Color.Black);
                gs.DrawImage(src, -left, -top, w, h);
                g.Clear(Color.Black);
                g.InterpolationMode = InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = PixelOffsetMode.Half;
                g.SmoothingMode = SmoothingMode.None;
                g.DrawImage(square, new Rectangle(0, 0, outSize, outSize), new Rectangle(0, 0, side, side), GraphicsUnit.Pixel);
                dst.Save(tmp, ImageFormat.Png);
            }
        }
        File.Copy(tmp, dstPath, true);
        File.Delete(tmp);
    }

    public static int Main(string[] args)
    {
        if (args.Length < 1)
        {
            Console.WriteLine("Usage: CropPropSquare <dir> [outSize]");
            return 1;
        }
        string dir = args[0];
        int outSize = args.Length > 1 ? int.Parse(args[1]) : 512;
        string[] names = { "bottle.png", "celery.png", "grass.png", "rice.png", "peanut.png", "spoon.png", "mushroom.png", "sugar.png", "water.png", "soap.png" };
        foreach (var name in names)
        {
            string path = Path.Combine(dir, name);
            Process(path, path, outSize);
            Console.WriteLine("cropped " + name);
        }
        return 0;
    }
}
