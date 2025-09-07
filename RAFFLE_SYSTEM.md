# 🎟️ Raffle Draw System

A complete raffle draw system built with Laravel and React, featuring beautiful UI, automatic winner selection, and comprehensive permission management.

## ✨ Features

### 🏢 Organization Features
- **Create Raffles**: Organizations can create raffle draws with custom prizes
- **Manage Raffles**: Edit, update, and delete raffles (before tickets are sold)
- **Draw Winners**: Manual or automatic winner selection
- **Track Sales**: Monitor ticket sales and progress
- **Image Upload**: Add attractive images to raffles

### 👥 User Features
- **Browse Raffles**: View all available raffle draws
- **Purchase Tickets**: Buy multiple tickets for raffles
- **Track Tickets**: View purchased tickets and winning status
- **View Winners**: See announced winners and prizes

### 🤖 Automatic Features
- **Auto-Draw**: Automatic winner selection when draw time arrives
- **Scheduled Jobs**: Background processing for raffle draws
- **Real-time Updates**: Live progress tracking and status updates

## 🗄️ Database Structure

### Tables
- **`raffles`**: Main raffle information
- **`raffle_tickets`**: Individual tickets purchased by users
- **`raffle_winners`**: Winner records with prize information

### Key Fields
```sql
raffles:
- title, description, ticket_price
- total_tickets, sold_tickets
- draw_date, status (active/completed/cancelled)
- image, prizes (JSON), winners_count
- organization_id

raffle_tickets:
- ticket_number (unique), raffle_id, user_id
- price, status (active/winner/refunded)

raffle_winners:
- raffle_id, raffle_ticket_id, user_id
- position (1st, 2nd, 3rd), prize_name, prize_description
- announced_at
```

## 🔐 Permissions

### Organization Role
- `raffle.read` - View raffles
- `raffle.create` - Create new raffles
- `raffle.edit` - Edit raffles
- `raffle.update` - Update raffles
- `raffle.delete` - Delete raffles
- `raffle.draw` - Draw winners

### User Role
- `raffle.read` - View raffles
- `raffle.purchase` - Buy tickets

## 🎨 Frontend Pages

### 1. Raffles Index (`/raffles`)
- **Grid Layout**: Beautiful card-based raffle display
- **Search & Filter**: Find raffles by title, description, or status
- **Progress Bars**: Visual ticket sales progress
- **Status Badges**: Active, Completed, Draw Time indicators
- **Responsive Design**: Works on all devices

### 2. Create Raffle (`/raffles/create`)
- **Tabbed Interface**: Organized form sections
- **Basic Info**: Title, description, pricing, draw date
- **Prize Management**: Add/edit multiple prizes
- **Image Upload**: Drag-and-drop image support
- **Real-time Validation**: Instant form validation

### 3. Raffle Details (`/raffles/{id}`)
- **Full Information**: Complete raffle details
- **Ticket Purchase**: Buy tickets with quantity selection
- **Progress Tracking**: Visual sales progress
- **Winner Display**: Beautiful winner announcement
- **My Tickets**: User's purchased tickets

### 4. Edit Raffle (`/raffles/{id}/edit`)
- **Same Interface**: Consistent with create form
- **Pre-filled Data**: All existing information loaded
- **Validation**: Prevents editing completed raffles
- **Image Management**: Update or keep existing image

## 🚀 Backend Features

### Controllers
- **RaffleController**: Full CRUD operations
- **Permission Checks**: Secure access control
- **File Upload**: Image handling with validation
- **Transaction Safety**: Database consistency

### Models
- **Raffle**: Main raffle model with relationships
- **RaffleTicket**: Individual ticket management
- **RaffleWinner**: Winner tracking and prizes

### Jobs & Commands
- **ProcessRaffleDraws**: Automatic winner selection
- **ProcessRaffleDrawsCommand**: Console command for scheduling

## 🎯 Key Features

### 1. Beautiful UI/UX
- **Modern Design**: Clean, professional interface
- **Gradient Buttons**: Eye-catching call-to-action buttons
- **Status Indicators**: Clear visual feedback
- **Responsive Layout**: Mobile-first design
- **Loading States**: Smooth user experience

### 2. Smart Ticket System
- **Unique Numbers**: Auto-generated ticket numbers (RT000001)
- **Bulk Purchase**: Buy multiple tickets at once
- **Status Tracking**: Active, Winner, Refunded states
- **User History**: Track all purchased tickets

### 3. Prize Management
- **Multiple Prizes**: Support for 1st, 2nd, 3rd place and more
- **Custom Descriptions**: Detailed prize information
- **Position Icons**: Crown, Medal, Award icons for winners
- **JSON Storage**: Flexible prize data structure

### 4. Automatic Drawing
- **Scheduled Jobs**: Background processing
- **Random Selection**: Fair winner selection algorithm
- **Transaction Safety**: Database consistency
- **Logging**: Complete audit trail
- **Error Handling**: Robust error management

### 5. Permission System
- **Role-based Access**: Organization vs User permissions
- **Secure Routes**: Middleware protection
- **UI Hiding**: Hide unauthorized elements
- **Custom 403 Page**: Beautiful permission denied page

## 🔧 Installation & Setup

### 1. Run Migrations
```bash
php artisan migrate
```

### 2. Seed Permissions
```bash
php artisan db:seed --class=ComprehensivePermissionsSeeder
```

### 3. Clear Caches
```bash
php artisan permission:cache-reset
php artisan cache:clear
```

### 4. Schedule Auto-Draws (Optional)
Add to your cron schedule:
```bash
* * * * * cd /path-to-your-project && php artisan raffles:process-draws >> /dev/null 2>&1
```

## 🎮 Usage Examples

### Creating a Raffle
1. Navigate to `/raffles`
2. Click "Create Raffle"
3. Fill in basic information
4. Add prizes (minimum 1)
5. Set draw date and time
6. Upload image (optional)
7. Click "Create Raffle"

### Buying Tickets
1. Browse raffles on `/raffles`
2. Click on a raffle to view details
3. Select quantity (1-10 tickets)
4. Click "Buy Tickets"
5. View your tickets in "My Tickets" section

### Drawing Winners
1. Wait for draw date/time
2. System automatically draws winners
3. Or manually trigger draw (if you have permission)
4. Winners are announced with prizes
5. Raffle status changes to "Completed"

## 🎨 Design Highlights

### Color Scheme
- **Primary**: Purple to Pink gradients
- **Success**: Green for completed raffles
- **Warning**: Red for draw time
- **Info**: Blue for active raffles

### Icons
- **Gift**: Raffle icon
- **Ticket**: Ticket purchases
- **Crown**: 1st place winner
- **Medal**: 2nd place winner
- **Award**: 3rd place winner
- **Trophy**: General winner icon

### Animations
- **Hover Effects**: Card hover animations
- **Progress Bars**: Smooth progress animations
- **Loading States**: Spinner animations
- **Transitions**: Smooth page transitions

## 🔒 Security Features

- **Permission Middleware**: Route-level protection
- **File Upload Validation**: Secure image handling
- **CSRF Protection**: Form security
- **SQL Injection Prevention**: Eloquent ORM
- **XSS Protection**: Input sanitization

## 📱 Mobile Responsiveness

- **Grid Layout**: Responsive card grid
- **Touch Friendly**: Large buttons and inputs
- **Optimized Images**: Proper image sizing
- **Mobile Navigation**: Collapsible sidebar
- **Touch Gestures**: Swipe-friendly interface

## 🚀 Performance

- **Lazy Loading**: Efficient data loading
- **Pagination**: Large dataset handling
- **Image Optimization**: Compressed images
- **Caching**: Permission and data caching
- **Database Indexing**: Optimized queries

## 🎉 Conclusion

The Raffle Draw System provides a complete, production-ready solution for organizations to run raffle draws with a beautiful, user-friendly interface. It includes all necessary features for both organizers and participants, with robust security, automatic processing, and a modern design that works perfectly on all devices.

Perfect for:
- **Charity Organizations**: Fundraising raffles
- **Community Events**: Local raffle draws
- **Corporate Events**: Company raffles
- **Online Contests**: Digital raffle systems

Built with ❤️ using Laravel, React, and modern web technologies.


