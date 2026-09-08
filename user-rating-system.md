# AlgoSense User Rating System
## Rich Input ELO Rating System

### Given,

 1. **User Rating**: When a user first interacts with the platform, they are given the option to pick their current skill level according to them. This isn't a problem as their skill level is then adjusted based on their performance. As the user solves problems that cover defined primary topics and secondary topics, the user's skill on those topics is encoded in their profile, alongside their global ELO rating.
	 1. Beginner: 1500
	 2. Intermediate: 2000
	 3. Veteran: 2700
	 4. Expert: 3500
 2. **Problem Rating**: Every DSA problem on the platform has a ELO rating. These ratings are derived from a public database of leetcode problems(Source) that have been assigned these ratings based on the problems' difficulty. We have around 2,500 problems, more than enough to get the platform up and running.
 3. **ELO Probability function**: This is used to find the probability of a user solving a particular problem. This takes the following as inputs:
	 1.  The user's ELO Rating
	 2. User's Weighted Average *primary* topics rating: Weighted by past solved problems difficulty that have the same topic, and averaged across number of primary topics of the problem. If none present we take the user's ELO Rating.
	 3. User's Weighted Average *secondary* topics rating: Weighted by past solved problems difficulty that have the same topic, and averaged across number of secondary topics of the problem. If none present we take the user's ELO Rating.
	 4. The Problems ELO Rating

We use the following formula's to calculate the probability:
$Effective\:User\:Rating =0.5*User\:Elo\:Rating\\ + 0.3*Weighted\: Avg\:Primary\:Topics\:Rating\\+
0.3*Weighted\: Avg\:Secondary\:Topics\:Rating$

$P(User \:Solves\:Problem) = \frac{1}{1+ 10^{\frac{Problem\:ELO - Effective\:User\:Rating}{400}}}$

> Note: A deep dive into how and why this formula works in the later sections!


 4. **Number of Attempts Modifier**: To stop users from spamming a problem and constantly increasing their ELO Rating.
	 1. 1st Attempt: 1
	 2. 2nd Attempt: 0.5
	 3. 3rd Attempt: 0.15
	 4. 4th Attempt: 0.05
 5. **ELO Score Difference Constant** $(K)$: This constant is used to vary the final rating change.

### Calculated,
#### User Performance (THE HARNESSING AGE OF AI)
User Performance against a question is judged by an AI Model very strategically to derive the best possible **deterministic** evaluation of submitted explanation against the problem.

Every problem in the AlgoSense contains 1 Expected Approach, and a minimum of 2 other approaches, each approach containing:

 1. Steps
 2. Spoken explanation
 3. Requirements or Constraints
 4. Edge cases weighted by their importance
 5. Time and Space Complexity

The AI is then systematically provided system and user prompts and asked to essentially **pick from the possible outputs using enums making it near deterministic** :

> Note: The prompts have been engineered and optimized to run on free tier Models!

First find this data:

    {
    identified_approach: [ Enum of possible approaches ],
    explanation_rating: [optimal, correct, partially_correct, incorrect],
    explanation_passed: [true, false],
    missing_points_in_explanation: ["Missed Point 1", "Missed Point 2"],
    }
Then another query to the AI finds, under the identified approach(information being passed through the system prompt), which edge cases are covered in the user's explanation?

    {
    edge_case_1_coverage: ["correct", "partial", "incorrect", "missing"]
    edge_case_2_coverage: ["correct", "partial", "incorrect", "missing"]
    ...
    }

We now have all the judgement here, everything the AI responds with is alpha numeric/spoken words, **working with how the AI functions is essential to get sensible output**. Most of the output is converted into numeric forms to further evaluation for example, `explanation_rating` is turned into,

    "optimal": 100,
    "correct": 75,
    "partially_correct": 50,
    "incorrect": 0,

With all this we now can calculate a **User Performance Score**:

$User\:Performance = 0.55 * (Approach\:Score/100)\\+0.25 * (Edge Case Score/100)\\+0.2(Problem\:Difficulty\:Addition)$


### Conclusion
Using the below formula we can now calculate the rating change $(\Delta R)$ to apply to the User's ELO Rating and their Topic Ratings:

$\Delta R = Number\:of\:Attempts\:Modifier * ELO\:Constant(K) \\*\:(User\:Performance - P(User \:Solves\:Problem))$

And we can modify the user's profile with some key indicators, these are less definitive and act as a general guide.

 1. Weighted Average Approach Score: Cumulative of all the user's solves based on the problems difficulty
 2. Weighted Average Edge Case Score: Cumulative of all the user's solves based on the problems difficulty.
 3. $Total\:Score = 0.45 * Weighted\:Average\:Approach\:Score\\+0.35 * Weighted\:Average\:EdgeCase\:Score\\+0.20 * Consistency\:Score$

### How the ELO Probability Function works:
First let's assume:

$User\:Strength = U\\Problem\:Strength = P$

We will later prove that this model assumes this accurately to the real performance of the user and the difficulty of the problem respectively. Then,

$P(User's\:Strength\:solves\:Problem's\:Strength) = \frac{U}{U+P}\:\:\:[Zermelo's\:Model]$

$Odds\:of\:User's\:Strength\:solves\:Problem's\:Strength = \frac{U}{P}$

Zermelo's model doesn't have any justification for the above formula, but it's been taken as a given and as we has prove $U$ and $P$ to match their qualities, we choose to move forward. Now,

$log_{10}(Odds\:of\:User\:Solving) = log_{10}(U/P) = log_{10}(U) - log_{10}(P)$

$Odds\:of\:User\:Solving = 10^{log_{10}(U) - log_{10}(P)}$

Using,
$Probability = \frac{1}{1+\frac{1}{Odds}}$

We get,
$P(User \:Solves\:Problem) = \frac{1}{1+ 10^{ log_{10}(U) - log_{10}(P)}}$

Now just multiplying using arbitary constants to get neater numbers in practice we get,

$P(User \:Solves\:Problem) = \frac{1}{1+ 10^{\frac{400log_{10}(U) - 400log_{10}(P)}{400}}}$

Now we suppose,
$R_u = User\:Rating = 400log_{10}(U)\\R_p = Problem\:Rating = 400log_{10}(P)$

Therefore, we reach the final form of the Probability equation,

$P(User \:Solves\:Problem) = \frac{1}{1+ 10^{\frac{Problem\:ELO - Effective\:User\:Rating}{400}}}$

In the Zermelo Model **there exist correct ratings** such that, when those ratings are assigned to a user and a problem, the ELO **probability function produces the correct probabilities**. So we have to verify that the update algorithm of this model produces those correct ratings. The proof of the convergence of these ratings to those correct ratings is out of the scope of this explanation but has been proved time and time again, here are some references to the extended proof:
[Convergence analysis of a family of Zermelo-type iterations for the Bradley--Terry model](https://arxiv.org/abs/2607.22221)
[Zermelo Model Convergence](https://www.youtube.com/watch?v=inXUp5j107I)

> Bit of history trivia: We commonly call this the ELO rating system, but the actual ELO rating system(by Élő Árpád Imre) uses a completely different probability function, it assumes Strengths to fall in a normal distribution, but as it is computationally difficult to compute that we use the Zermelo model but still call it the ELO model!
