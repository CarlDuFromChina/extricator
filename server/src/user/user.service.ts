import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cookie } from 'src/cookie/cookie.entity';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import EncryptFactory, { IEncrypt, EncryptType } from '../common/encrypt';
import assert from 'src/common/assert';

@Injectable()
export class UserService {
  private md5: IEncrypt;
  
  constructor(
    @InjectRepository(User)
    private usersReporsitory: Repository<User>,
    @InjectRepository(Cookie)
    private cookiesRepository: Repository<Cookie>
  ) {
    this.md5 = EncryptFactory.createInstance(EncryptType.md5);
  }

  async getData(code: string): Promise<User> {
    return this.usersReporsitory.findOne(code, { relations: ['cookie' ]});
  }

  async getAllData(): Promise<User[]> {
    return this.usersReporsitory.find({ relations: ['cookie'] });
  }

  async createData(user: User): Promise<void> {
    if (assert.isEmpty(user.code) || assert.isEmpty(user.password)) {
      throw new HttpException('注册失败', 500);
    }
    var data = await this.getData(user.code);
    if (!assert.isNil(data)) {
      throw new HttpException('注册失败，用户已被注册', 500);
    }

    var cookie = new Cookie();
    const { jd, juejin } = user.cookie;
    cookie.user_code = user.code;
    cookie.jd = jd;
    cookie.juejin = juejin;
    await this.cookiesRepository.save(cookie);

    user.password = this.md5.encrypt(user.password);
    user.cookie = cookie
    await this.usersReporsitory.save(user);
  }

  async updateData(user: User): Promise<void> {
    if (assert.isEmpty(user.code) || assert.isEmpty(user.password)) {
      throw new HttpException('更新失败，用户编号和密码不能为空', 500);
    }
    var data = await this.getData(user.code);
    if (!data) {
      throw new HttpException('更新失败，用户不存在', 500);
    }
    user.password = this.md5.encrypt(user.password);
    await this.usersReporsitory.save(user);
  }

  async deleteData(code: string): Promise<boolean> {
    if (assert.isEmpty(code)) {
      return false;
    }
    var data = await this.getData(code);
    if (assert.isNil(data)) {
      throw new HttpException('删除失败，用户不存在', 500);
    }
    var result = await this.usersReporsitory.delete(code);
    return result.affected > 0;
  }
}
