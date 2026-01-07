from rembg import remove
from PIL import Image

input_image = Image.open("../Gemini_Generated_Image_dnj982dnj982dnj9.png")
output_image = remove(input_image)
output_image.save("output.png")
