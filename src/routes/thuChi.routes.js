const express = require("express")
const router = express.Router()
const {authenticate} = require("../middleware/auth")
const {checkRole} = require("../middleware/roleCheck")
const {validate} = require("../middleware/validation")
const {send,sendError} = require("../services/chuyenKho.service")
const Joi = require("joi")
const {ROLES} = require("../config/constants")
const { sendSuccess } = require("../ultils/respone")

const thuChiService = require("../services/thuChi.service")

const thuChiSchema = Joi.object({
    so_phieu:Joi.string().required().max(50),
    ngay_giao_dich:Joi.date().required(),
    
    ma_kho:Joi.string().required(),
    ma_kh:Joi.string().required(),
    so_tien:Joi.number().required(),
    loai:Joi.string().required(),
    dien_giai:Joi.string(),
})

router.get("/",
    authenticate,
    async(req,res,next)=>{
        try{
            
        const data = await thuChiService.getDanhSach()    
        sendSuccess(res,data,"Success")
    }catch(err){
        next(err)
    }
})

router.get("/:so_phieu",
    authenticate,
    async(req,res,next)=>{
        try{
            const {so_phieu}  = req.params;
            const data = await thuChiService.getChiTiet(so_phieu)
            sendSuccess(res,data,"success",201)
            if(!data){
                return sendError(res,"so_phieu khong ton tai",401);
            }
        }catch(error){
            next(error)
        }
    }
)

router.post("/",
    authenticate,
    validate(thuChiSchema),
    checkRole(ROLES.ADMIN,ROLES.NHAN_VIEN,ROLES.QUAN_LY_CHI_NHANH,ROLES.QUAN_LY_CHI_NHANH),
    async(req,res,next)=>{
        try{
            const data={
                ...req.body,
                nguoi_tao:req.user.username,
            }
            const result= await thuChiService.taoPhieu(data);
            sendSuccess(res,result,"Success",201)
        }catch(error){
            next(error)
        }
    }
)

router.post("/:so_phieu/gui-duyet",
    authenticate,
    checkRole(ROLES.ADMIN,ROLES.NHAN_VIEN,ROLES.QUAN_LY_CHI_NHANH),
    async(req,res,next)=>{
        try{
            const {so_phieu} = req.params

            const result = await thuChiService.guiDuyet(
                so_phieu,
                req.user.username,
            )

            sendSuccess(res,result,"Success",201)
        }catch(error){
            next(error)
        }
    }
)

router.post("/:so_phieu/phe-duyet",
    authenticate,
        checkRole(ROLES.ADMIN,ROLES.QUAN_LY_CHI_NHANH,ROLES.QUAN_LY_CTY),
    async(req,res,next)=>{
        try{
            const {so_phieu} = req.params
            const result = await thuChiService.pheDuyet(
                so_phieu,
                req.user.username
            )
            sendSuccess(res,result,"success",201)
        }catch(error){
            next(error)
        }
    }
)
router.post("/:so_phieu/huy",
    checkRole(ROLES.ADMIN,ROLES.QUAN_LY_CHI_NHANH,ROLES.QUAN_LY_CTY),
    authenticate,
    async(req,res,next)=>{
        try{
            const {ly_do} = req.body
            const {so_phieu} = req.params
            const result = await thuChiService.tuChoiDuyet(
                so_phieu,
                req.user.username,
                ly_do,
            )
            sendSuccess(result,res,"Success",201)
        }catch(error){
            next(error)
        }
}
)
module.exports = router