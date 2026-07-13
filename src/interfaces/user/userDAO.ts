import User from "../../entities/user.js"
import type UserScores from "../../entities/userScores.js"
import type IPaginated from "../paginated.js"

export default interface IUserDAO {
  create(userData: User): Promise<User>  // Store User data into the Users table in the db
  update(userId: string, payload: Partial<User>): Promise<User> // Update the user based on the userId in the Users table using the payload, it could update any field in the user row.
  updateSelfProfile(userId: string, payload: Partial<User>): Promise<User> //Update the Users information in the Users table based on userId
  delete(userId: string): Promise<boolean> //Delete User row in the Users table
  findById(userId: string): Promise<User | null> // Find and return user using userId in the Users table
  findByEmail(email: string): Promise<User | null> //Find and return user using email in the Users table 
  findAll(filters: Partial<User>, page: number, perPage: number): Promise<IPaginated<User>> //Use filter object that contains key value pairs to return a paginated response of the filtered Users from the Users table.
  toggleBanUser(userId: string, toggle: boolean): Promise<User> // Use the values of userId and toggle to alter the banned field in that specific user in the Users table
  unbanUser(userId: string): Promise<User> //Find the user using userId in the Users table and set banned field to false
  getUserScores(userId: string): Promise<User['scores'] | null> //Find the user in the Users table and the query only returns the scores field
  setUserScores(userId: string, scores: Partial<UserScores>): Promise<UserScores> // Find the user in the Users table using userId and update the jsonb object in the scores field, or overwrite it completely with the scores argument
  getUserSubmissions(userId: string): Promise<User['submissions'] | null> //Return the sumbissions field for the userId in the Users table
  getLast5Submissions(userId: string): Promise<User['submissions'] | null> //Return the last 5 array items in the submissions field for the userId in the Users table
  viewProfile(userId: string): Promise<User | null> // Return entire user based on userID from Users table
  toggleEmailNotifications(userId: string, enable: boolean): Promise<boolean> // Update the email_notifications_enabled field in the user based on userId in the Users table
  updateUser(userId: string, payload: Partial<User>): Promise<User> // Update the user based on the userId in the Users table using the payload, it could update any field in the user row.
}
