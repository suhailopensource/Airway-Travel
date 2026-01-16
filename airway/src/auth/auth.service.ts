import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    const { password, ...result } = user.toJSON();
    return result;
  }

  async getCurrentUser(userId: string): Promise<User | null> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      return null;
    }
    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword as User;
  }
}

