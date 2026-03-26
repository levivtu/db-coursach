import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { GenresService } from './genres.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('genres')
export class GenresController {
  constructor(private genresService: GenresService) {}

  @Get()
  getAllGenres() {
    return this.genresService.findAll();
  }

  @Get(':id')
  getGenreById(@Param('id') id: string) {
    return this.genresService.findById(Number(id));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createGenre(@Req() req: AuthenticatedRequest, @Body() body: any) {
    // Check if user is an employee
    const userRole = req.user!.userRole;
    if (userRole !== 'employee') {
      throw new Error('Only employees can create genres');
    }
    return this.genresService.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  updateGenre(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    // Check if user is an employee
    const userRole = req.user!.userRole;
    if (userRole !== 'employee') {
      throw new Error('Only employees can update genres');
    }
    return this.genresService.update(Number(id), body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteGenre(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    // Check if user is an employee
    const userRole = req.user!.userRole;
    if (userRole !== 'employee') {
      throw new Error('Only employees can delete genres');
    }
    return this.genresService.delete(Number(id));
  }
}
