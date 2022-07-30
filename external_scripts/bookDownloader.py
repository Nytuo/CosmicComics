""" importing the libraries, bs4 for webscraping,
requests to parse the URL, shutil for creating
the files and os to interact with the system (more precisly the path)"""
import bs4
import requests
import shutil
import os
import sys


def save_file(data, destination):
    with open(destination, 'wb') as file:
        shutil.copyfileobj(data.raw, file)


def deterimating_filename(index, ext):
    if index < 10:
        return "000"+str(index)+ext
    elif index >= 10 and index < 100:
        return "00"+str(index)+ext
    elif index >= 100 and index < 1000:
        return "0"+str(index)+ext
    else:
        return str(index)+ext


def determine_extension(ext):
    if ext.startswith('.png'):
        ext = '.png'
    elif ext.startswith('.jpg'):
        ext = '.jpg'
    elif ext.startswith('.jfif'):
        ext = '.jfif'
    elif ext.startswith('.com'):
        ext = '.jpg'
    elif ext.startswith('.svg'):
        ext = '.svg'
    return ext


def extract(data, type,path):
    """this function extract from a website all the images"""

    if type == True:
        f = open(data, 'r')
        iop = 0
        for io in f.readlines():
            if os.path.exists(os.getcwd()+"/out"+str(iop)) == False:
                os.mkdir("out"+str(iop))
            URL_input = io
            print('[i] Fetching from ', URL_input)
            URLdata = requests.get(URL_input)
            soup = bs4.BeautifulSoup(URLdata.text, "html.parser")
            ImgTags = soup.find_all('img')
            i = 0
            for link in ImgTags:
                try:
                    images = link.get('src')
                    ext = images[images.rindex('.'):]
                    determine_extension(ext)
                    data = requests.get(images, stream=True)
                    filename = deterimating_filename(i, ext)
                    save_file(data, os.getcwd() +
                    "/out"+str(iop)+"/"+filename)
                    i += 1
                except:
                    pass
            print('[!] Downloaded Successfully...')
            iop += 1
    else:
        if os.path.exists(path) == False:
            os.mkdir(path)
        URL_input = data
        print('[i] Fetching from ', URL_input)
        URLdata = requests.get(URL_input)
        soup = bs4.BeautifulSoup(URLdata.text, "html.parser")
        ImgTags = soup.find_all('img')
        i = 0
        for link in ImgTags:
            try:
                images = link.get('src')
                ext = images[images.rindex('.'):]
                determine_extension(ext)
                data = requests.get(images, stream=True)
                filename = deterimating_filename(i, ext)
                save_file(data, path+"/"+filename)
                i += 1
            except:
                pass
        print('[!] Downloaded Successfully...')
    print("[!] All Done!")
if len(sys.argv) == 3 and sys.argv[1] != 'undefined':
    extract(sys.argv[1], False,sys.argv[2])
else:
    print("[!] No URL specified!")