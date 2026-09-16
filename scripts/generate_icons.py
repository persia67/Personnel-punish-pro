import os
import struct
import subprocess

def generate_win_ico():
    master = './src/assets/images/app_icon_master_1785575009595.jpg'
    if not os.path.exists(master):
        master = './public/icon.png'

    sizes = [16, 24, 32, 48, 64, 128, 256]
    pngs = {}
    for s in sizes:
        pngs[s] = f'/tmp/icon_{s}.png'
        subprocess.run(['convert', master, '-resize', f'{s}x{s}', pngs[s]], check=True)

    ico_entries = []

    for s in sizes:
        if s == 256:
            with open(pngs[256], 'rb') as f:
                img_data = f.read()
            w_byte = 0  # 0 represents 256
            h_byte = 0
        else:
            rgba_file = f'/tmp/icon_{s}.rgba'
            subprocess.run(['convert', pngs[s], '-depth', '8', f'rgba:{rgba_file}'], check=True)
            with open(rgba_file, 'rb') as f:
                rgba = f.read()
            
            bgra_lines = []
            for y in range(s - 1, -1, -1):
                line = []
                for x in range(s):
                    idx = (y * s + x) * 4
                    r, g, b, a = rgba[idx], rgba[idx+1], rgba[idx+2], rgba[idx+3]
                    line.extend([b, g, r, a])
                bgra_lines.append(bytes(line))
            
            pixel_data = b''.join(bgra_lines)
            and_mask_line_bytes = ((s + 31) // 32) * 4
            and_mask = b'\x00' * (and_mask_line_bytes * s)
            
            header = struct.pack('<IIIHHIIIIII', 40, s, s * 2, 1, 32, 0, len(pixel_data) + len(and_mask), 0, 0, 0, 0)
            img_data = header + pixel_data + and_mask
            w_byte = s
            h_byte = s

        ico_entries.append({
            'w': w_byte,
            'h': h_byte,
            'bpp': 32,
            'data': img_data
        })

    header = struct.pack('<HHH', 0, 1, len(ico_entries))
    offset = 6 + len(ico_entries) * 16

    directory = []
    body = []

    for entry in ico_entries:
        data_len = len(entry['data'])
        directory.append(struct.pack('<BBBBHHII', 
            entry['w'], entry['h'], 0, 0, 1, entry['bpp'], data_len, offset
        ))
        body.append(entry['data'])
        offset += data_len

    ico_bytes = header + b''.join(directory) + b''.join(body)

    destinations = [
        './src-tauri/icons/icon.ico',
        './release/.icon-ico/icon.ico',
        './public/favicon.ico'
    ]

    for dst in destinations:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'wb') as f:
            f.write(ico_bytes)

    print('Windows RC.EXE compliant ICO generated successfully for all target paths!')

if __name__ == '__main__':
    generate_win_ico()
