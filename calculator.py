#!/usr/bin/env python3
"""
A simple calculator program that performs basic arithmetic operations.
"""

def add(x, y):
    """Add two numbers."""
    return x + y

def subtract(x, y):
    """Subtract two numbers."""
    return x - y

def multiply(x, y):
    """Multiply two numbers."""
    return x * y

def divide(x, y):
    """Divide two numbers."""
    if y == 0:
        return "Error: Cannot divide by zero!"
    return x / y

def power(x, y):
    """Raise x to the power of y."""
    return x ** y

def modulus(x, y):
    """Return the remainder of x divided by y."""
    if y == 0:
        return "Error: Cannot divide by zero!"
    return x % y

def display_menu():
    """Display the calculator menu."""
    print("\n" + "=" * 40)
    print("       SIMPLE CALCULATOR")
    print("=" * 40)
    print("Select operation:")
    print("1. Add (+)")
    print("2. Subtract (-)")
    print("3. Multiply (*)")
    print("4. Divide (/)")
    print("5. Power (^)")
    print("6. Modulus (%)")
    print("7. Exit")
    print("=" * 40)

def get_numbers():
    """Get two numbers from the user."""
    try:
        num1 = float(input("Enter first number: "))
        num2 = float(input("Enter second number: "))
        return num1, num2
    except ValueError:
        print("Error: Please enter valid numbers!")
        return None, None

def main():
    """Main calculator loop."""
    print("Welcome to the Simple Calculator!")
    
    while True:
        display_menu()
        
        try:
            choice = input("Enter choice (1-7): ")
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        
        if choice == '7':
            print("Thank you for using the calculator. Goodbye!")
            break
        
        if choice not in ['1', '2', '3', '4', '5', '6']:
            print("Invalid choice! Please select a number between 1 and 7.")
            continue
        
        num1, num2 = get_numbers()
        if num1 is None or num2 is None:
            continue
        
        if choice == '1':
            result = add(num1, num2)
            print(f"\nResult: {num1} + {num2} = {result}")
        elif choice == '2':
            result = subtract(num1, num2)
            print(f"\nResult: {num1} - {num2} = {result}")
        elif choice == '3':
            result = multiply(num1, num2)
            print(f"\nResult: {num1} * {num2} = {result}")
        elif choice == '4':
            result = divide(num1, num2)
            print(f"\nResult: {num1} / {num2} = {result}")
        elif choice == '5':
            result = power(num1, num2)
            print(f"\nResult: {num1} ^ {num2} = {result}")
        elif choice == '6':
            result = modulus(num1, num2)
            print(f"\nResult: {num1} % {num2} = {result}")

if __name__ == "__main__":
    main()
