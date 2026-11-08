import { createSchema, createYoga } from 'graphql-yoga';
import { NotFoundError, type ScheduleService, type ScheduleView } from './service';

/** GraphQL is used for reads: the week screen gets everything in one query. */
const typeDefs = /* GraphQL */ `
  enum Slot { AM PM }
  enum Severity { error warning }

  type Employee {
    id: ID!
    name: String!
    role: String!
    hourlyRateCents: Int!
    maxHours: Int!
    offDays: [Int!]!
    hours: Int!
  }

  type Shift {
    id: ID!
    day: Int!
    slot: Slot!
    employee: Employee!
  }

  type Issue {
    rule: String!
    severity: Severity!
    message: String!
    employeeId: ID
    day: Int
  }

  type CoverageRule {
    day: Int!
    slot: Slot!
    minStaff: Int!
  }

  type Schedule {
    id: ID!
    weekStart: String!
    status: String!
    budgetCents: Int!
    laborCostCents: Int!
    employees: [Employee!]!
    shifts: [Shift!]!
    coverage: [CoverageRule!]!
    issues: [Issue!]!
  }

  type Query {
    schedule(id: ID!): Schedule
  }
`;

export function createGraphQL(service: ScheduleService) {
  return createYoga({
    graphqlEndpoint: '/graphql',
    schema: createSchema({
      typeDefs,
      resolvers: {
        Query: {
          schedule: async (_: unknown, { id }: { id: string }) =>
            service.view(id).catch((e) => (e instanceof NotFoundError ? null : Promise.reject(e))),
        },
        Schedule: {
          shifts: (week: ScheduleView) =>
            week.shifts.map((s) => ({ ...s, employee: week.employees.find((e) => e.id === s.employeeId) })),
        },
      },
    }),
  });
}
