# Setup Instructions

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/face_clockin"

# MCP Server
MCP_PORT=3001

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

## Database Setup

1. Install PostgreSQL
2. Create a database named `face_clockin`
3. Update the DATABASE_URL in your `.env.local` file
4. Run the following commands:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

## Running the Application

1. **Start the MCP server** (in a separate terminal):
   ```bash
   npm run mcp:dev
   ```

2. **Start the Next.js application**:
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to `http://localhost:3000`

## Troubleshooting

- Make sure PostgreSQL is running
- Check that the DATABASE_URL is correct
- Ensure the MCP server is running on port 3001
- Check browser console for any errors
- Verify camera permissions are granted
