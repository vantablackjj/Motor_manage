const {query}= require('../config/database');

class BrandService{
    static async getAll(){
        const result = await query(
            `Select ma_nh,ten_nh,status
                From sys_nhan_hieu
            Order by ten_nh
            `
        )
        return result.rows;
    }

    static async getById(ma_nh){
        const result = await query(
            `select * From sys_nhan_hieu 
                where ma_nh= $1
            `,[ma_nh]
        )
        return result.rows[0]
    }

    static async create(data){
        const exists = await query(
            `Select 1 from sys_nhan_hieu where ma_nh = $1`,
            [data.ma_nh]
        )
        if(exists.rows.length){
            throw new Error ("Hang xe da ton tai")
        }
        const result = await query(
            `Insert into sys_nhan_hieu (ma_nh,ten_nh,status)
            Values ($1,$2,$3)
            returning *
            `
            ,[data.ma_nh,data.ten_nh,data.status]
        )
        return result.rows[0];
    }

    static async update(ma_nh,data){
        const result = await query(
            `Update  sys_nhan_hieu
            set ten_nh=$1,
            status= $2
            where ma_nh= $3
            returning *
            `,[data.ten_nh,data.status,ma_nh]
        )
        return result.rows[0]
    }

    static async delete(ma_nh){
        const result = await query(
            `Delete from sys_nhan_hieu where ma_nh = $1
            returning *
            `,[ma_nh]
        )
        return result.rows[0]
    }

}
module.exports = BrandService