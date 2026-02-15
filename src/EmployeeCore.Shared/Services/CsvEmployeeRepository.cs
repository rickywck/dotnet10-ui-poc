using EmployeeCore.Shared.Models;
using System.Globalization;

namespace EmployeeCore.Shared.Services;

public class CsvEmployeeRepository : IEmployeeRepository
{
    private readonly string _csvFilePath;
    private readonly SemaphoreSlim _semaphore = new(1, 1);

    public CsvEmployeeRepository(string csvFilePath)
    {
        _csvFilePath = csvFilePath;
        EnsureFileExists();
    }

    private void EnsureFileExists()
    {
        var directory = Path.GetDirectoryName(_csvFilePath);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        if (!File.Exists(_csvFilePath))
        {
            var header = "Id,FirstName,LastName,Email,Department,HireDate,Salary";
            File.WriteAllText(_csvFilePath, header);
        }
    }

    public async Task<List<Employee>> GetAllAsync()
    {
        await _semaphore.WaitAsync();
        try
        {
            var employees = new List<Employee>();
            var lines = await File.ReadAllLinesAsync(_csvFilePath);

            for (int i = 1; i < lines.Length; i++)
            {
                var employee = ParseEmployeeFromCsv(lines[i]);
                if (employee != null)
                {
                    employees.Add(employee);
                }
            }

            return employees;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<Employee?> GetByIdAsync(int id)
    {
        await _semaphore.WaitAsync();
        try
        {
            var lines = await File.ReadAllLinesAsync(_csvFilePath);

            for (int i = 1; i < lines.Length; i++)
            {
                var employee = ParseEmployeeFromCsv(lines[i]);
                if (employee != null && employee.Id == id)
                {
                    return employee;
                }
            }

            return null;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<Employee> CreateAsync(Employee employee)
    {
        await _semaphore.WaitAsync();
        try
        {
            var lines = await File.ReadAllLinesAsync(_csvFilePath);
            var maxId = 0;

            for (int i = 1; i < lines.Length; i++)
            {
                var fields = lines[i].Split(',');
                if (fields.Length > 0 && int.TryParse(fields[0], out var id))
                {
                    maxId = Math.Max(maxId, id);
                }
            }

            employee.Id = maxId + 1;

            var csvLine = SerializeEmployeeToCsv(employee);
            await File.AppendAllLinesAsync(_csvFilePath, new[] { csvLine });

            return employee;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<Employee?> UpdateAsync(Employee employee)
    {
        await _semaphore.WaitAsync();
        try
        {
            var lines = (await File.ReadAllLinesAsync(_csvFilePath)).ToList();
            bool found = false;

            for (int i = 1; i < lines.Count; i++)
            {
                var fields = lines[i].Split(',');
                if (fields.Length > 0 && int.TryParse(fields[0], out var id) && id == employee.Id)
                {
                    lines[i] = SerializeEmployeeToCsv(employee);
                    found = true;
                    break;
                }
            }

            if (found)
            {
                await File.WriteAllLinesAsync(_csvFilePath, lines);
                return employee;
            }

            return null;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<bool> DeleteAsync(int id)
    {
        await _semaphore.WaitAsync();
        try
        {
            var lines = (await File.ReadAllLinesAsync(_csvFilePath)).ToList();
            var originalCount = lines.Count;

            lines = lines.Where(line =>
            {
                var fields = line.Split(',');
                return fields.Length == 0 || !int.TryParse(fields[0], out var employeeId) || employeeId != id;
            }).ToList();

            if (lines.Count < originalCount)
            {
                await File.WriteAllLinesAsync(_csvFilePath, lines);
                return true;
            }

            return false;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private static Employee? ParseEmployeeFromCsv(string csvLine)
    {
        if (string.IsNullOrWhiteSpace(csvLine))
            return null;

        var fields = csvLine.Split(',');
        if (fields.Length < 7)
            return null;

        try
        {
            return new Employee
            {
                Id = int.Parse(fields[0].Trim()),
                FirstName = fields[1].Trim(),
                LastName = fields[2].Trim(),
                Email = fields[3].Trim(),
                Department = fields[4].Trim(),
                HireDate = DateTime.ParseExact(fields[5].Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture),
                Salary = decimal.Parse(fields[6].Trim(), CultureInfo.InvariantCulture)
            };
        }
        catch
        {
            return null;
        }
    }

    private static string SerializeEmployeeToCsv(Employee employee)
    {
        return $"{employee.Id}," +
               $"{employee.FirstName}," +
               $"{employee.LastName}," +
               $"{employee.Email}," +
               $"{employee.Department}," +
               $"{employee.HireDate:yyyy-MM-dd}," +
               $"{employee.Salary.ToString(CultureInfo.InvariantCulture)}";
    }
}
