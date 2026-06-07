import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService, SafeUser } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<{ accessToken: string; user: SafeUser }> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<{ accessToken: string; user: SafeUser }> {
    return this.authService.login(dto);
  }

  @Post('forgot-password')  
  @HttpCode(HttpStatus.OK)  
  forgotPassword(@Body() body: { email: string }) {  
    return this.authService.forgotPassword(body.email);  
  }  
    
  @Post('reset-password')  
  @HttpCode(HttpStatus.OK)  
  resetPassword(@Body() body: { token: string; newPassword: string }) {  
    return this.authService.resetPassword(body.token, body.newPassword);  
  }
}
