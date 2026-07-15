@echo off
echo Starting Darbar Sweets Database...

docker ps -a --filter "name=darbar-sweets-db" --format "{{.Names}}" | findstr darbar-sweets-db >nul
if %errorlevel%==0 (
    echo Database container exists. Starting it...
    docker start darbar-sweets-db
) else (
    echo Creating database container for the first time...
    docker run --name darbar-sweets-db ^
      -e POSTGRES_USER=postgres ^
      -e POSTGRES_PASSWORD=darbar123 ^
      -e POSTGRES_DB=darbar_sweets_erp ^
      -p 5432:5432 ^
      -v darbar_sweets_data:/var/lib/postgresql/data ^
      -d postgres:15
)

echo Waiting for database to be ready...
ping 127.0.0.1 -n 9 >nul
echo Database is ready!
