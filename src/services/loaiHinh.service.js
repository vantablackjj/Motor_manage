const {query} = require("../config/database")

class loaiHinhService{
    static async getAll(){
        const result = await query(
            `select * from sys_loai_hinh
            Order by ten_lh
            `
        )
        return result.rows
    }

    static async getByID(id){
        const result = await  query(`
            select * from sys_loai_hinh
            where id = $1
            `
            ,[id]
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

    static async update(id, data) {
    const result = await query(
      `UPDATE sys_loai_hinh
       SET ma_lh=$1, ten_lh=$2, status=$3
       WHERE id=$4
       RETURNING *`,
      [data.ma_lh, data.ten_lh, data.status, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
        const exists = await this.getByID(id);
        if (!exists) throw new Error('Loại hình không tồn tại');

        const result = await query(
            `UPDATE sys_loai_hinh
             SET status = false
             WHERE id = $1
             RETURNING *`,
            [id]
        );
        return result.rows[0];
    }
}

module.exports = loaiHinhService;