const cmd = require("node-cmd")
const ioclient = require("socket.io-client")
const fs = require("fs")
const fs_extra = require("fs-extra")
const config = require("./config")

let io = ioclient.connect(config.SERVER_HOST)
io.on("connect", () => {
    console.log("[OK] Pmx2Fbx Service 기동")

    fs_extra.removeSync(__dirname + "/upload")
    fs_extra.mkdir(__dirname + "/upload")
})
io.on("disconnect", () => {
    console.log("[!] Pmx2Fbx Service 정지")
})
io.on("connect_error", () => {
    console.log("[ER] Pmx2Fbx Service 기동 에러")
})

io.on("convert", (request) => {
    let pmx_file = request.pmx
    let vmd_file = request.vmd
    let requestId = request.req_id

    let pmx_file_path = config.UPLOAD_FOLDER + requestId + ".pmx"
    let vmd_file_path = config.UPLOAD_FOLDER + requestId + ".vmd"
    let fbx_file_path = config.UPLOAD_FOLDER + requestId + ".fbx"
    let xml_file_path = config.UPLOAD_FOLDER + requestId + ".xml"

    if(pmx_file != undefined) {
        fs.writeFile(config.UPLOAD_FOLDER + requestId + ".pmx", pmx_file, (err) => {
            if(err) {
                send_response(requestId, false, null, null)
            } else {
                console.log("[RQ] " + requestId + ".pmx Write OK.")

                if(vmd_file != undefined) {
                    fs.writeFile(config.UPLOAD_FOLDER + requestId + ".vmd", vmd_file, (err) => {
                        if(err) {
                            // .vmd file write failed.
                            send_response(requestId, false, null, null)
                        } else {
                            console.log("[RQ] " + requestId + ".vmd Write OK.")
                            convert(pmx_file_path, vmd_file_path, (is_success) => {
                                if(is_success) {
                                    fs.readFile(fbx_file_path, (fbx_err, fbx_data) => {
                                        fs.readFile(xml_file_path, (xml_err, xml_data) => {
                                            if(fbx_err || xml_err) {
                                                send_response(requestId, false, null, null)
                                            } else {
                                                send_response(requestId, true, fbx_data, xml_data)
                                            }
                                        })
                                    })
                                    
                                } else {
                                    send_response(requestId, false, null, null)
                                }
                            })
                        }
                    })
                } else {
                    // VMD 파일을 선택하지 않음.
                    convert(pmx_file_path, null, (is_success) => {
                        if(is_success) {
                            fs.readFile(fbx_file_path, (fbx_err, fbx_data) => {
                                fs.readFile(xml_file_path, (xml_err, xml_data) => {
                                    if(fbx_err || xml_err) {
                                        send_response(requestId, false, null, null)
                                    } else {
                                        send_response(requestId, true, fbx_data, xml_data)
                                    }
                                })
                            })
                            
                        } else {
                            send_response(requestId, false, null, null)
                        }
                    })
                }
            }
        })
    } else {
        // PMX 파일이 없음
        send_response(requestId, false, null, null)
    }
})

function send_response(req_id, success, fbx, xml) {
    console.log("[RS] " + req_id + " converting : " + success)
    io.emit("convert_ok", {
        req_id: req_id,
        success: success,
        fbx: fbx,
        xml: xml
    })
}

function convert(pmx_file_path, vmd_file_path, callback) {
    let command = config.COMMAND + " \"" + pmx_file_path + "\""
    if(vmd_file_path != null) {
        command += (" " + vmd_file_path)
    }

    console.log("[EXEC] " + command + " execute.")

    cmd.get(command, (err, success, stderr) => {
        if(err) {
            callback(false)
        }

        if(success) {
            callback(true)
        }
    })
}