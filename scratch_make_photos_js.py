import json

with open('scratch_student_photos.json') as f:
    d = json.load(f)

content = '// Pre-registered official biometric reference photos for demonstration accounts\n'
content += 'export const DEFAULT_STUDENT_PHOTOS = {\n'
for k, v in d.items():
    content += f'  "{k}": "{v}",\n'
content += '};\n'

with open('frontend/src/defaultStudentPhotos.js', 'w') as f:
    f.write(content)

print('Wrote frontend/src/defaultStudentPhotos.js')
