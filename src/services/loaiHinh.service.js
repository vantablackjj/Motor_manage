const {query} = require("../config/database")

class loaiHinhService{
    static async getAll(){
        const result = await query(
            `select * from sys_loai_hinh
            Order by ten_lh
            `
        )
        return result.rows[0]
    }

    static async getByID(ma_lh){
        const result = await  query(`
            select * from sys_loai_hinh
            where ma_lh = $1
            `
            ,[ma_lh]
        )
        return result.rows[0]
    }

    static async create(data){
        const checkExsits = await query(`
                Select 1 from sys_loai_hinh 
                where ma_lh = $1    
            `,[data.ma_lh]
        )
        if(!checkExsits){
            throw new Error("loại hình đã tồn tại")
        }
        const result = await query(`
                insert into sys_loai_hinh(ma_lh,ten_lh,status)
                Values($1,$2,$3)
                Returning *    
            `,[data.ma_lh,data.ten_lh,data.status]
        )
        return result.rows[0]
    }

    static async update(ma_nh, data) {
    const result = await query(
      `UPDATE sys_hang_xe
       SET ten_nh=$1, status=$2
       WHERE ma_nh=$3
       RETURNING *`,
      [data.ten_nh, data.status, ma_nh]
    );
    return result.rows[0];
  }

  static async delete(ma_nh) {
    const result = await query(
      `DELETE FROM sys_hang_xe WHERE ma_nh=$1 RETURNING *`,
      [ma_nh]
    );
    return result.rows[0];
  }
}

module.exports = loaiHinhService;