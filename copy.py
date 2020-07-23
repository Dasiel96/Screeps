import os
import shutil

num_of_lines = 0

def parseImports(file_text_array, file_dict):
    global num_of_lines
    parsed_text = ""
    for line in file_text_array:
        parsed_line = line
        if line[0:6] == "import":
            i = 0
            import_path = ""
            import_file = ""

            while line[i] != '"':
                import_path += line[i]
                i += 1
            i += 1

            while line[i] != '"':
                import_file += line[i]
                i += 1
            
            file_name = import_file.split("/")
            file_name = file_name[len(file_name) - 1]

            if file_name in file_dict:
                parsed_line = f'{import_path}"./{file_name}"\n'
            else:
                parsed_line = f'{import_path}"{file_name}"\n'

        parsed_text += parsed_line
        num_of_lines += 1
    return parsed_text

def deleteDirFiles(path):
    for entry in os.listdir(path):
        entry_path = f'{path}/{entry}'
        if os.path.isdir(entry_path):
            deleteDirFiles(entry_path)
            os.rmdir(entry_path)
        else:
            os.remove(entry_path)

def copyfiles(src, dst, file_dict):

    for entry in os.scandir(src):
        if entry.is_dir():
            copyfiles(entry.path, dst, file_dict)
        else:
            src_lines = []
            copied_text = ""

            with open(entry.path, "r") as f:
                for line in f.readlines():
                    src_lines.append(line)
            
            with open(os.path.join(dst, entry.name), "w") as f:
                f.write(parseImports(src_lines, file_dict))

def loadFiles(src):
    file_dict = {}
    for entry in os.scandir(src):
        if entry.is_dir():
            d = loadFiles(entry.path)
            for key in d:
                file_dict[key] = d[key]
        elif not entry.name in file_dict:
            key_parts = entry.name.split(".")
            key = key_parts[0]
            file_dict[key] = True
    return file_dict


src = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dev", "src")
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "src")

if __name__ == "__main__":
    if not os.path.exists(dst):
        os.mkdir(dst)
    else:
        deleteDirFiles(dst)
    
    d = loadFiles(src)

    copyfiles(src, dst, d)
    print(num_of_lines)